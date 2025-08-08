import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

const PricingCard = ({
  type,
  planItems,
  buttonText,
  bottomText,
  headingText,
  subText,
  showRecommended,
  onClick,
  isActivePlan = false,
  isDisabled = false,
  defaultInterval = "yearly",
  monthlyPrice,
  yearlyPrice,
  monthlyPriceId,
  yearlyPriceId,
  buttonAboveFeatures = false,
}) => {
  const [selectedInterval, setSelectedInterval] = useState(defaultInterval);

  useEffect(() => {
    setSelectedInterval(defaultInterval);
  }, [defaultInterval]);

  const PlanItem = ({ text }) => (
    <div className="flex justify-between">
      <p className="gap-2 flex items-center font-geist font-medium leading-6">
        <Check className="h-4 w-4" />
        {text}
      </p>
      <Info className="h-5 w-5 p-[2px] text-[#52525B]" />
    </div>
  );

  return (
    <div
      className={`flex flex-col bg-white border w-full md:max-w-[378px] p-6 md:p-[33px] rounded-[12px] ${
        type === "subscription"
          ? "md:rounded-l-none md:rounded-r-[12px]"
          : "md:rounded-r-none md:rounded-l-[12px]"
      } ${
        isActivePlan
          ? "border-blue-600 ring-2 ring-blue-600"
          : "border-[#E4E4E7]"
      } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="flex flex-col gap-6 justify-start text-black h-full">
        <div className={type === "subscription" ? "space-y-3" : "space-y-1"}>
          <div className="font-sans font-medium">
            <h3 className="font-semibold text-3xl leading-9 tracking-tight">
              {headingText}
            </h3>
            <div className="flex justify-between mt-1 items-center relative">
              <p className="text-[#52525B]">{subText}</p>
              {showRecommended && (
                <p className="absolute top-0 right-0 h-[28px] py-[2px] px-3 bg-[#0063E2] rounded-[32px] text-white text-xs sm:text-base">
                  Recommended
                </p>
              )}
            </div>
          </div>
          {type === "subscription" ? (
            <div className="max-h-[114px] h-full flex flex-col gap-4">
              <Tabs
                value={selectedInterval}
                onValueChange={setSelectedInterval}
                className="w-full sm:w-[312px]"
              >
                <TabsList
                  className="grid w-full grid-cols-2 h-10 text-foreground font-medium text-sm leading-5"
                  style={{ marginTop: "2px" }}
                >
                  <TabsTrigger value="yearly" className="h-8 relative">
                    Yearly
                    <div className="absolute -top-3 bg-black left-10 sm:left-16 text-xs leading-4 font-semibold font-sans h-5 rounded-full py-0.5 px-2.5 text-primary-foreground">
                      Save 30%
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="h-8">
                    Monthly
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="yearly" className="mt-4">
                  <div className="space-x-1.5 flex items-end">
                    {/* Strikethrough monthly price */}
                    {monthlyPrice && (
                      <span className="text-[#334155]/[.7] relative text-nowrap mr-1 sm:mr-2 font-extrabold text-3xl sm:text-5xl leading-[32px] sm:leading-[48px] -tracking-[1.25px] font-sans">
                        {monthlyPrice}
                        <span className="absolute border-b-[3px] sm:border-b-[4px] border-[#334155]/[.7] left-0 w-full h-[60%]"></span>
                      </span>
                    )}
                    {/* Display yearly price / 12 */}
                    <h1 className="font-extrabold text-4xl sm:text-5xl leading-[40px] sm:leading-[48px] -tracking-[1.25px] font-sans">
                      {yearlyPrice ? (yearlyPrice / 12).toFixed(0) : "N/A"}
                    </h1>
                    <span className="text-lg sm:text-xl leading-6 sm:leading-7 font-semibold font-sans">
                      $ USD
                    </span>
                  </div>
                </TabsContent>
                <TabsContent value="monthly" className="mt-4">
                  <div className="space-x-1.5 flex items-end">
                    <h1 className="font-extrabold text-4xl sm:text-5xl leading-[40px] sm:leading-[48px] -tracking-[1.25px] font-sans">
                      {monthlyPrice || "N/A"}
                    </h1>
                    <span className="text-lg sm:text-xl leading-6 sm:leading-7 font-semibold font-sans">
                      $ USD
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="min-h-[90px] md:h-[114px] flex justify-end flex-col gap-2 w-full sm:w-[312px]">
              <p className="font-geist leading-6 text-[#52525B]">Starts with</p>
              <div className="space-x-1.5 flex items-end">
                <h1 className="font-extrabold text-4xl sm:text-5xl leading-[40px] sm:leading-[48px] -tracking-[1.25px] font-sans">
                  10
                </h1>
                <span className="text-lg sm:text-xl leading-6 sm:leading-7 font-semibold font-sans">
                  $ USD
                </span>
              </div>
            </div>
          )}
        </div>
        {/*  */}
        {buttonAboveFeatures && (
          <div className="flex flex-col gap-2">
            <Button
              className="h-10 font-sans py-2 px-3 leading-6 font-medium"
              onClick={
                isDisabled
                  ? undefined
                  : () => {
                      const price =
                        selectedInterval === "yearly"
                          ? yearlyPrice
                          : monthlyPrice;
                      const priceId =
                        selectedInterval === "yearly"
                          ? yearlyPriceId
                          : monthlyPriceId;
                      onClick(selectedInterval, price, priceId);
                    }
              }
              disabled={isDisabled}
            >
              {/* If plan is active (subscribed), use text from parent ('View Details'). */}
              {/* Otherwise (not subscribed), show dynamic select text based on interval. */}
              {isActivePlan
                ? buttonText
                : type === "subscription"
                ? selectedInterval === "yearly"
                  ? "Select Yearly Plan"
                  : "Select Monthly Plan"
                : buttonText}
            </Button>
            <p className="text-sm leading-[21px] text-[#52525B] text-center">
              {bottomText}
            </p>
          </div>
        )}
        {/*  */}
        <div className="flex flex-col gap-4">
          <p className="leading-6 font-geist text-[#52525B]">
            What&apos;s inside:
          </p>
          {planItems &&
            planItems.map((item, index) => (
              <PlanItem key={index} text={item} />
            ))}
        </div>
        {/*  */}
        {!buttonAboveFeatures && (
          <div className="flex flex-col gap-2 h-full justify-end">
            <Button
              className="h-10 font-sans py-2 px-3 leading-6 font-medium"
              onClick={
                isDisabled
                  ? undefined
                  : () => {
                      const price =
                        selectedInterval === "yearly"
                          ? yearlyPrice
                          : monthlyPrice;
                      const priceId =
                        selectedInterval === "yearly"
                          ? yearlyPriceId
                          : monthlyPriceId;
                      onClick(selectedInterval, price, priceId);
                    }
              }
              disabled={isDisabled}
            >
              {/* If plan is active (subscribed), use text from parent ('View Details'). */}
              {/* Otherwise (not subscribed), show dynamic select text based on interval. */}
              {isActivePlan
                ? buttonText
                : type === "subscription"
                ? selectedInterval === "yearly"
                  ? "Select Yearly Plan"
                  : "Select Monthly Plan"
                : buttonText}
            </Button>
            <p className="text-sm leading-[21px] text-[#52525B] text-center">
              {bottomText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingCard;
