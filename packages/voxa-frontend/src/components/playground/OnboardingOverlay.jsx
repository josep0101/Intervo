"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { XIcon } from "lucide-react";
import { Caveat } from "next/font/google";

// Initialize the Caveat font specifically for this component
const caveatFont = Caveat({
  subsets: ["latin"],
  weight: ["400"], // Choose the weights you need for this component
  // No 'variable' needed here if you plan to use the className directly
});

// Helper to calculate angle between two points
const calculateAngle = (cx, cy, ex, ey) => {
  const dy = ey - cy;
  const dx = ex - cx;
  const theta = Math.atan2(dy, dx);
  let deg = theta * (180 / Math.PI);
  if (deg < 0) deg = 360 + deg; // Normalize to 0-360
  return deg;
};

const APPROX_TEXT_BLOCK_WIDTH = 350;
const APPROX_TEXT_BLOCK_HEIGHT = 300; // Approximate height for calculations
const VIEWPORT_PADDING = 10; // Min padding from viewport edges
const TARGET_GAP = 20; // Min gap from target element for fallback positions

const OnboardingOverlay = ({
  children,
  targetElementSelector,
  onboardingStepKey,
  text,
  arrowRotation = 0,
  onDismiss,
  preferViewportCenter = true,
  textOffset = { x: 0, y: -100 },
  hideArrow = false,
}) => {
  console.log("hideArrow", hideArrow);
  const { userProfile, markAgentOnboardingAsCompleted } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  const overlayRef = useRef(null); // For the main overlay div if needed, currently on "contents"
  const originalStylesRef = useRef({ zIndex: "", position: "" });
  const targetElementRef = useRef(null);

  const textContainerDivRef = useRef(null); // Ref for the text & arrow container div
  const arrowImgTagRef = useRef(null); // Ref for the arrow img tag

  useEffect(() => {
    setIsVisible(!userProfile?.agentOnboardingCompleted);
  }, [userProfile]);

  const positionElements = useCallback(() => {
    if (
      !isVisible ||
      !targetElementRef.current ||
      !textContainerDivRef.current ||
      (!arrowImgTagRef.current && !hideArrow)
    ) {
      if (textContainerDivRef.current)
        textContainerDivRef.current.style.visibility = "hidden";
      return;
    }

    const targetElement = targetElementRef.current;
    const targetRect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX, finalY;

    const overlaps = (rect1, rect2) =>
      !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );

    const getCandidateRect = (x, y) => ({
      left: x,
      top: y,
      right: x + APPROX_TEXT_BLOCK_WIDTH,
      bottom: y + APPROX_TEXT_BLOCK_HEIGHT,
      width: APPROX_TEXT_BLOCK_WIDTH,
      height: APPROX_TEXT_BLOCK_HEIGHT,
    });

    const isInViewport = (rect) =>
      rect.top >= VIEWPORT_PADDING &&
      rect.left >= VIEWPORT_PADDING &&
      rect.bottom <= viewportHeight - VIEWPORT_PADDING &&
      rect.right <= viewportWidth - VIEWPORT_PADDING;

    // 1. Attempt to position in viewport center
    let candidateX =
      viewportWidth / 2 - APPROX_TEXT_BLOCK_WIDTH / 2 + textOffset.x;
    let candidateY =
      viewportHeight / 2 - APPROX_TEXT_BLOCK_HEIGHT / 2 + textOffset.y;
    let candidateRect = getCandidateRect(candidateX, candidateY);

    if (
      preferViewportCenter &&
      !overlaps(candidateRect, targetRect) &&
      isInViewport(candidateRect)
    ) {
      finalX = candidateX;
      finalY = candidateY;
    } else {
      // 2. Fallback: Try positions around the target
      const fallbackPositions = [
        {
          x:
            targetRect.left +
            targetRect.width / 2 -
            APPROX_TEXT_BLOCK_WIDTH / 2 +
            textOffset.x,
          y:
            targetRect.top -
            APPROX_TEXT_BLOCK_HEIGHT -
            TARGET_GAP +
            textOffset.y,
          name: "above",
        }, // Y adjusted for textOffset to be consistent
        {
          x:
            targetRect.left +
            targetRect.width / 2 -
            APPROX_TEXT_BLOCK_WIDTH / 2 +
            textOffset.x,
          y: targetRect.bottom + TARGET_GAP + textOffset.y,
          name: "below",
        },
        {
          x:
            targetRect.left -
            APPROX_TEXT_BLOCK_WIDTH -
            TARGET_GAP +
            textOffset.x,
          y:
            targetRect.top +
            targetRect.height / 2 -
            APPROX_TEXT_BLOCK_HEIGHT / 2 +
            textOffset.y,
          name: "left",
        },
        {
          x: targetRect.right + TARGET_GAP + textOffset.x,
          y:
            targetRect.top +
            targetRect.height / 2 -
            APPROX_TEXT_BLOCK_HEIGHT / 2 +
            textOffset.y,
          name: "right",
        },
      ];

      let foundPosition = false;
      for (const pos of fallbackPositions) {
        candidateRect = getCandidateRect(pos.x, pos.y);
        if (
          !overlaps(candidateRect, targetRect) &&
          isInViewport(candidateRect)
        ) {
          finalX = pos.x;
          finalY = pos.y;
          foundPosition = true;
          break;
        }
      }

      if (!foundPosition) {
        // Absolute fallback: use the initial "above target" logic and let it be clamped
        finalX =
          targetRect.left +
          targetRect.width / 2 -
          APPROX_TEXT_BLOCK_WIDTH / 2 +
          textOffset.x;
        finalY =
          targetRect.top - APPROX_TEXT_BLOCK_HEIGHT - TARGET_GAP + textOffset.y;
      }
    }

    finalX = Math.max(
      VIEWPORT_PADDING,
      Math.min(
        finalX,
        viewportWidth - APPROX_TEXT_BLOCK_WIDTH - VIEWPORT_PADDING
      )
    );
    finalY = Math.max(
      VIEWPORT_PADDING,
      Math.min(
        finalY,
        viewportHeight - APPROX_TEXT_BLOCK_HEIGHT - VIEWPORT_PADDING
      )
    );

    textContainerDivRef.current.style.left = `${finalX}px`;
    textContainerDivRef.current.style.top = `${finalY}px`;
    textContainerDivRef.current.style.visibility = "visible";

    const arrowOrigX = finalX + APPROX_TEXT_BLOCK_WIDTH / 2;
    const arrowOrigY = finalY + 200; // Arrow pivot point relative to text block
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const angleToTarget = calculateAngle(
      arrowOrigX,
      arrowOrigY,
      targetCenterX,
      targetCenterY
    );
    if (arrowImgTagRef.current && !hideArrow) {
      arrowImgTagRef.current.style.transform = `rotate(${
        arrowRotation !== 0 ? arrowRotation : angleToTarget
      }deg)`;
    }
  }, [isVisible, preferViewportCenter, textOffset, arrowRotation, hideArrow]);

  useEffect(() => {
    let targetElement = null;
    // Define a handler that will be bound once to the target
    const handleTargetClick = (e) => {
      // Optional: Stop propagation if the target itself has click handlers
      // that shouldn't run when advancing onboarding.
      e.stopPropagation();
      e.preventDefault();

      console.log("marking agent onboarding as completed");
      // Mark the entire agent onboarding as completed
      // markAgentOnboardingAsCompleted();

      if (onDismiss) {
        onDismiss();
      }
      // Clean up self immediately after firing once (though useEffect cleanup also handles it)
      if (targetElementRef.current) {
        targetElementRef.current.removeEventListener(
          "click",
          handleTargetClick,
          { capture: true }
        );
      }
    };

    if (isVisible && targetElementSelector) {
      targetElement = document.querySelector(targetElementSelector);
      targetElementRef.current = targetElement;
      if (targetElement) {
        originalStylesRef.current = {
          zIndex: targetElement.style.zIndex,
          position: targetElement.style.position,
        };
        targetElement.style.zIndex = "1001";
        const computedStyle = window.getComputedStyle(targetElement);
        if (computedStyle.position === "static")
          targetElement.style.position = "relative";

        // Attach the one-time click listener to the target element
        // Use capture phase to ensure it fires before other listeners on the element if needed
        targetElement.addEventListener("click", handleTargetClick, {
          once: true,
          capture: true,
        });

        requestAnimationFrame(positionElements);
        window.addEventListener("resize", positionElements);
      } else {
        setIsVisible(false);
        console.warn(`Onboarding target: ${targetElementSelector} not found`);
      }
    } else {
      if (targetElementRef.current) {
        targetElementRef.current.style.zIndex =
          originalStylesRef.current.zIndex;
        targetElementRef.current.style.position =
          originalStylesRef.current.position;
        // Ensure to remove listener if overlay becomes hidden for other reasons
        targetElementRef.current.removeEventListener(
          "click",
          handleTargetClick,
          { capture: true }
        );
        targetElementRef.current = null;
      }
      if (textContainerDivRef.current)
        textContainerDivRef.current.style.visibility = "hidden";
      window.removeEventListener("resize", positionElements);
    }
    return () => {
      if (targetElementRef.current) {
        targetElementRef.current.style.zIndex =
          originalStylesRef.current.zIndex;
        targetElementRef.current.style.position =
          originalStylesRef.current.position;
        // General cleanup of the event listener
        targetElementRef.current.removeEventListener(
          "click",
          handleTargetClick,
          { capture: true }
        );
        targetElementRef.current = null;
      }
      if (textContainerDivRef.current)
        textContainerDivRef.current.style.visibility = "hidden";
      window.removeEventListener("resize", positionElements);
    };
  }, [isVisible, targetElementSelector, positionElements, onDismiss]); // Added onDismiss to dependency array

  const handleOverlayDismissInternally = async () => {
    // This function is for the X button or backdrop click
    // Mark the entire agent onboarding as completed
    markAgentOnboardingAsCompleted();

    // Hide the overlay immediately
    setIsVisible(false);
  };

  if (!isVisible && !children) return null;
  if (!isVisible && children) return <>{children}</>;

  return (
    <div ref={overlayRef} className="contents">
      {isVisible && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] transition-opacity duration-300"
            onClick={handleOverlayDismissInternally} // Changed to new internal dismiss handler
          />
          <div
            ref={textContainerDivRef}
            style={{
              position: "fixed",
              zIndex: 1002,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: `${APPROX_TEXT_BLOCK_WIDTH}px`,
              visibility: "hidden",
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: text }}
              className={`${caveatFont.className}`}
              style={{
                fontSize: "64.857px",
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "58px",
                color: "#FFF",
                textAlign: "center",
                marginBottom: "20px",
              }}
            />
            {!hideArrow && (
              <img
                ref={arrowImgTagRef}
                src="/assets/onboarding-arrow.svg"
                alt="Onboarding Arrow"
                style={{
                  transition: "transform 0.3s ease-in-out",
                  width: "184px",
                  height: "44px",
                }}
              />
            )}
          </div>
          <button
            onClick={handleOverlayDismissInternally} // Changed to new internal dismiss handler
            className="fixed top-4 right-4 text-white hover:text-gray-300 z-[1003] p-2"
            aria-label="Dismiss onboarding step"
          >
            <XIcon size={28} />
          </button>
        </>
      )}
    </div>
  );
};

export default OnboardingOverlay;
