export function Title({ children, subTitle=false }) {
  return (
    <div className="flex flex-col items-start gap-6 self-stretch border-b border-[hsl(var(--border))] pb-6">
      <h1 className={`text-card-foreground font-inter ${subTitle ? 'text-lg font-medium' : 'text-2xl font-semibold' } leading-6 tracking-[-0.72px]`}>
        {children}
      </h1>
    </div>
  );
}
