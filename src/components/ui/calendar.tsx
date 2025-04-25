import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center px-10 mb-4",
        caption_label: "text-base font-medium text-couples-text",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-full bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-couples-backgroundAlt border-none shadow-none"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full justify-center",
        head_cell: "text-couples-text/60 font-normal text-[0.85rem] pb-3 w-10 text-center",
        row: "flex w-full justify-center my-1",
        cell: "w-10 h-10 p-0 text-center flex items-center justify-center",
        day: cn(
          "h-9 w-9 rounded-full font-normal flex items-center justify-center transition-all duration-200",
          "hover:bg-couples-backgroundAlt aria-selected:opacity-100"
        ),
        day_selected: "bg-couples-accent text-white hover:bg-couples-accent/90 hover:text-white",
        day_today: "border-2 border-couples-accent",
        day_outside: "text-couples-text/30 hover:bg-couples-backgroundAlt/50",
        day_disabled: "text-couples-text/20 hover:bg-transparent cursor-not-allowed",
        day_range_middle: "aria-selected:bg-couples-backgroundAlt aria-selected:text-couples-text",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-5 w-5" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };