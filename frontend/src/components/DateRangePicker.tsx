import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { Calendar } from "./ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DateRangePicker({
    date,
    setDate,
    className,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Presets
    const presets = [
        {
            label: "Today",
            getValue: () => ({ from: new Date(), to: new Date() }),
        },
        {
            label: "Yesterday",
            getValue: () => ({
                from: subDays(new Date(), 1),
                to: subDays(new Date(), 1),
            }),
        },
        {
            label: "Last 7 Days",
            getValue: () => ({
                from: subDays(new Date(), 6),
                to: new Date(),
            }),
        },
        {
            label: "Last 30 Days",
            getValue: () => ({
                from: subDays(new Date(), 29),
                to: new Date(),
            }),
        },
        {
            label: "This Month",
            getValue: () => ({
                from: startOfMonth(new Date()),
                to: endOfMonth(new Date()),
            }),
        },
        {
            label: "Last Month",
            getValue: () => ({
                from: startOfMonth(subMonths(new Date(), 1)),
                to: endOfMonth(subMonths(new Date(), 1)),
            }),
        },
    ]

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        size="sm"
                        className={cn(
                            "w-[240px] justify-start text-left font-normal bg-white h-9",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Date Range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col sm:flex-row">
                        {/* Presets Sidebar */}
                        <div className="flex flex-col gap-1 p-3 border-b sm:border-r sm:border-b-0">
                            <span className="px-2 py-1 text-xs font-semibold text-slate-500 mb-1">
                                Presets
                            </span>
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start text-xs font-normal h-8"
                                    onClick={() => {
                                        setDate(preset.getValue())
                                        // setIsOpen(false) 
                                    }}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                            <div className="my-2 border-t border-slate-100" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start text-xs font-normal h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    setDate(undefined)
                                    setIsOpen(false)
                                }}
                            >
                                Clear Filter
                            </Button>
                        </div>

                        {/* Calendar */}
                        <div className="p-3">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
