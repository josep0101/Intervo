import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import Mastercard from "@/assets/mastercard.svg";

export default function PaymentMethodCard({
  title,
  expMonth,
  expYear,
  address,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border gap-4 p-6 pr-8 bg-white">
      <div className="flex gap-2">
        <div className="flex gap-2 mb-auto items-center">
          <Checkbox className="data-[state=checked]:bg-green-500 data-[state=checked]:text-primary-foreground" />
          <Image src={Mastercard} alt="Mastercard" width={36} height={24} />
        </div>
        <div className="flex flex-col gap-1 font-sans">
          <p className="font-semibold text-sm leading-5">{title}</p>
          <p className="text-sm text-foreground">
            Expires {expMonth}/{expYear}
          </p>
          <p className="text-sm text-foreground truncate max-w-[300px]">
            {address}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button className="h-8" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="outline"
          className="h-8 bg-secondary"
          onClick={onDelete}
        >
          Delete Card
        </Button>
      </div>
    </div>
  );
}
