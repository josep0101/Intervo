import Link from "next/link";

const UsageCard = ({
  x = 0,
  y = 0,
  title,
  actionUrl,
  actionTitle,
  isAmount = false,
  workspaceId,
}) => {
  const circumference = 2 * Math.PI * 40;
  const progress = ((y - x) / y) * circumference;

  // Conditionally render a different layout if y is 0 and title is 'creditsUsed'
  if (y === 0 && title === "Credits used") {
    return (
      <div className="flex flex-col bg-gray-50 px-4 py-6 border border-[#E4E4E7] shadow-md rounded-xl w-full justify-center items-center h-[174px]">
        <div>
          <p className="font-inter text-sm leading-5 mb-4 text-center">
            You have used all your available credits.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <Link
            className="text-sm leading-5 text-[#0F172A] font-sans underline"
            href={`/${workspaceId}/settings/plans`}
          >
            Upgrade account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white px-4 py-6 border border-[#E4E4E7] shadow-md rounded-xl w-full">
      <div className="h-[44px] w-[44px]">
        <svg
          className="transform rotate-90"
          viewBox={`0 0 100 100`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Circle */}
          <circle
            cx={50}
            cy={50}
            r={40}
            strokeWidth={14}
            className="text-slate-300"
            fill="none"
            stroke="currentColor"
          />
          {/* Progress Circle */}
          <circle
            cx={50}
            cy={50}
            r={40}
            strokeWidth={14}
            className="text-green-500"
            fill="none"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            style={{
              transform: "scale(-1, 1)",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
      </div>
      <div className="pt-3 pb-4 ">
        <span className="text-[#09090B] font-semibold font-inter text-xl leading-7">
          {isAmount && "$"}
          {x.toLocaleString()}
        </span>
        <span className="text-[#6E6E77] font-inter tetx-sm leading-5">
          /{isAmount && "$"}
          {y.toLocaleString()}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm leading-6 text-[#6E6E77] font-sans">
          {title}
        </span>
        <Link
          className="text-sm leading-5 text-[#0F172A] font-sans underline"
          href={actionUrl}
        >
          {actionTitle}
        </Link>
      </div>
    </div>
  );
};

export default UsageCard;
