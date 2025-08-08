// lib/creditService.js
const Activity = require('../models/Activity');

/**
 * Calculate credit balance for a workspace
 * 
 * @param {Object} workspace - The workspace object with credit configuration
 * @param {Boolean} includeDetails - Whether to include detailed credit info (cycle dates, etc.)
 * @returns {Object} Credit balance information
 */
async function calculateCreditBalance(workspace, includeDetails = true) {
    try {
        // Base credit info structure
        let creditInfo = {
            billingConfigured: false,
            // Default total values are always included
            totalAllocatedCredits: 0,
            totalUsedCredits: 0,
            totalRemainingCredits: 0
        };

        // Initialize cycleStartDate and cycleEndDate with null
        let cycleStartDate = null;
        let cycleEndDate = null;

        const now = new Date();
        
        // Check if there are any non-expired one-time credits
        let hasValidOneTimeCredits = false;
        if (workspace.oneTimeCredits && Array.isArray(workspace.oneTimeCredits) && workspace.oneTimeCredits.length > 0) {
            hasValidOneTimeCredits = workspace.oneTimeCredits.some(credit => 
                !credit.expiresAt || new Date(credit.expiresAt) > now
            );
        }

        // If no billing and no one-time credits, return the default credit info
        if (!workspace.billingCycleAnchor && typeof workspace.planAllocatedCredits === 'undefined' && !hasValidOneTimeCredits) {
            return creditInfo;
        }

        // Determine if billing plan is configured
        const hasBillingPlan = workspace.billingCycleAnchor && typeof workspace.planAllocatedCredits !== 'undefined';
        creditInfo.billingConfigured = hasBillingPlan;
        
        // Cycle date calculation
        if (hasBillingPlan) {
            try {
                // Regular billing cycle calculation
                const anchorDate = new Date(workspace.billingCycleAnchor);
                cycleStartDate = new Date(anchorDate);
                cycleEndDate = new Date(anchorDate);
                
                if (workspace.billingCycleInterval === 'monthly') {
                    while (cycleEndDate <= now) {
                        cycleStartDate = new Date(cycleEndDate);
                        cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
                    }
                } else if (workspace.billingCycleInterval === 'yearly') {
                    while (cycleEndDate <= now) {
                        cycleStartDate = new Date(cycleEndDate);
                        cycleEndDate.setFullYear(cycleEndDate.getFullYear() + 1);
                    }
                } else {
                    // Default to monthly if interval is invalid
                    console.error(`Invalid billing interval: ${workspace.billingCycleInterval} for workspace ${workspace._id}`);
                    while (cycleEndDate <= now) {
                        cycleStartDate = new Date(cycleEndDate);
                        cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
                    }
                }
                
                // Ensure cycleStartDate is not in the future if anchorDate is in the future
                if (cycleStartDate > now) {
                    if (workspace.billingCycleInterval === 'monthly') {
                        cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
                        cycleEndDate.setMonth(cycleEndDate.getMonth() - 1);
                    } else { // yearly
                        cycleStartDate.setFullYear(cycleStartDate.getFullYear() - 1);
                        cycleEndDate.setFullYear(cycleEndDate.getFullYear() - 1);
                    }
                }
            } catch (dateError) {
                console.error(`Error calculating billing cycle dates: ${dateError.message}`);
                // Fallback to current month if date calculation fails
                cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        } else if (hasValidOneTimeCredits) {
            try {
                // One-time credits only - use their date range as the cycle
                // Find earliest addedAt and latest expiresAt among valid credits
                let earliestAddDate = null;
                let latestExpireDate = null;
                
                workspace.oneTimeCredits.forEach(credit => {
                    // Only consider non-expired credits
                    if (!credit.expiresAt || new Date(credit.expiresAt) > now) {
                        if (credit.addedAt) {
                            const addDate = new Date(credit.addedAt);
                            
                            // Track earliest add date
                            if (!earliestAddDate || addDate < earliestAddDate) {
                                earliestAddDate = addDate;
                            }
                        }
                        
                        // Track latest expiry date
                        if (credit.expiresAt) {
                            const expireDate = new Date(credit.expiresAt);
                            if (!latestExpireDate || expireDate > latestExpireDate) {
                                latestExpireDate = expireDate;
                            }
                        }
                    }
                });
                
                // If we couldn't determine dates, use fallback dates
                cycleStartDate = earliestAddDate || new Date(now.getFullYear(), now.getMonth(), 1);
                cycleEndDate = latestExpireDate || new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            } catch (dateError) {
                console.error(`Error calculating one-time credit dates: ${dateError.message}`);
                // Fallback to current month if date calculation fails
                cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        } else {
            // Fallback to current month if no valid dates are available
            cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            cycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        // Get usage data for the current cycle
        let totalUsedInCycle = 0;
        try {
            if (cycleStartDate && cycleEndDate) {
                const usageAggregation = await Activity.aggregate([
                    { $match: { 
                        workspace: workspace._id, 
                        status: 'completed', 
                        createdAt: { $gte: cycleStartDate, $lt: cycleEndDate } 
                      }
                    },
                    { $group: { _id: null, totalUsed: { $sum: "$creditsUsed" } } }
                ]);
                
                console.log(usageAggregation, "usageAggregation");
                totalUsedInCycle = usageAggregation.length > 0 ? usageAggregation[0].totalUsed : 0;
            }
        } catch (aggregateError) {
            console.error(`Error aggregating usage data: ${aggregateError.message}`);
            // Continue with zero usage if aggregation fails
        }
        
        // Calculate billing plan info if available
        if (hasBillingPlan) {
            const planAllocatedCredits = workspace.planAllocatedCredits || 0;
            const planUsedCredits = Math.min(totalUsedInCycle, planAllocatedCredits);
            const planRemainingCredits = Math.max(0, planAllocatedCredits - planUsedCredits);
            
            creditInfo.billingPlan = {
                allocatedCredits: planAllocatedCredits,
                usedCredits: planUsedCredits,
                remainingCredits: planRemainingCredits,
                billingInterval: workspace.billingCycleInterval || 'monthly'
            };
            
            if (includeDetails && cycleStartDate && cycleEndDate) {
                try {
                    creditInfo.billingPlan.cycleStartDate = cycleStartDate.toISOString();
                    creditInfo.billingPlan.cycleEndDate = cycleEndDate.toISOString();
                } catch (dateError) {
                    console.error(`Error converting dates to ISO string for billing plan: ${dateError.message}`);
                    // Omit dates if conversion fails
                }
            }
        }
        
        // Calculate one-time credits info
        let oneTimeAllocatedCredits = 0;
        if (hasValidOneTimeCredits) {
            const oneTimeValidCredits = workspace.oneTimeCredits.filter(credit => 
                !credit.expiresAt || new Date(credit.expiresAt) > now
            );
            
            oneTimeAllocatedCredits = oneTimeValidCredits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
            
            // If billing plan exists, one-time credits are only used after plan credits are exhausted
            let oneTimeUsedCredits = 0;
            if (hasBillingPlan) {
                const planAllocatedCredits = workspace.planAllocatedCredits || 0;
                oneTimeUsedCredits = Math.max(0, totalUsedInCycle - planAllocatedCredits);
            } else {
                oneTimeUsedCredits = totalUsedInCycle;
            }
            
            oneTimeUsedCredits = Math.min(oneTimeUsedCredits, oneTimeAllocatedCredits);
            const oneTimeRemainingCredits = Math.max(0, oneTimeAllocatedCredits - oneTimeUsedCredits);
            
            creditInfo.oneTimeCredits = {
                allocatedCredits: oneTimeAllocatedCredits,
                usedCredits: oneTimeUsedCredits,
                remainingCredits: oneTimeRemainingCredits,
                credits: oneTimeValidCredits.map(credit => ({
                    _id: credit._id,
                    amount: credit.amount || 0,
                    description: credit.description || '',
                    addedAt: credit.addedAt ? new Date(credit.addedAt).toISOString() : null,
                    expiresAt: credit.expiresAt ? new Date(credit.expiresAt).toISOString() : null
                }))
            };
            
            if (includeDetails && !hasBillingPlan && cycleStartDate && cycleEndDate) {
                try {
                    creditInfo.oneTimeCredits.cycleStartDate = cycleStartDate.toISOString();
                    creditInfo.oneTimeCredits.cycleEndDate = cycleEndDate.toISOString();
                } catch (dateError) {
                    console.error(`Error converting dates to ISO string for one-time credits: ${dateError.message}`);
                    // Omit dates if conversion fails
                }
            }
        }
        
        // Add total aggregated values
        const totalPlanCredits = (workspace.planAllocatedCredits && workspace.planAllocatedCredits > 0) 
                                ? workspace.planAllocatedCredits 
                                : 0;
        const totalOneTimeCredits = oneTimeAllocatedCredits;
        
        const totalAllocated = totalPlanCredits + totalOneTimeCredits;
        
        creditInfo.totalAllocatedCredits = totalAllocated;
        creditInfo.totalUsedCredits = totalUsedInCycle;
        creditInfo.totalRemainingCredits = Math.max(0, totalAllocated - totalUsedInCycle);
        
        if (includeDetails && cycleStartDate && cycleEndDate) {
            try {
                creditInfo.cycleStartDate = cycleStartDate.toISOString();
                creditInfo.cycleEndDate = cycleEndDate.toISOString();
            } catch (dateError) {
                console.error(`Error converting overall dates to ISO string: ${dateError.message}`);
                // Omit dates if conversion fails
            }
        }

        return creditInfo;
    } catch (error) {
        console.error(`Error in calculateCreditBalance: ${error.message}`, error);
        // Return a safe default object if any part of the calculation fails
        return {
            billingConfigured: false,
            totalAllocatedCredits: 0,
            totalUsedCredits: 0,
            totalRemainingCredits: 0
        };
    }
}

module.exports = {
    calculateCreditBalance
}; 