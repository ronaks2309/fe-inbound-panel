import { CalendarIcon, Filter } from "lucide-react"
import type { Column } from "@tanstack/react-table"
import { format } from "date-fns"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Calendar } from "../ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover"
import { Label } from "../ui/label"

interface DataTableDateFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
}

export function DataTableDateFilter<TData, TValue>({
    column,
    title,
}: DataTableDateFilterProps<TData, TValue>) {
    // Simple filter state: { start: string | null, end: string | null }
    // We assume column filter value handles this object or string
    // Note: dates are stored as strings in filter state
    const filterValue = (column?.getFilterValue() as { start?: string; end?: string }) || {}

    const setFilter = (key: 'start' | 'end', date: Date | undefined) => {
        const val = date ? date.toISOString() : undefined;
        const newVal = { ...filterValue, [key]: val };
        // cleanup empty keys
        if (!newVal.start && !newVal.end) {
            column?.setFilterValue(undefined)
        } else {
            column?.setFilterValue(newVal)
        }
    }

    const clearFilter = () => {
        column?.setFilterValue(undefined)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={`Filter ${title}`}>
                    <Filter className={cn("h-4 w-4 opacity-50", (filterValue.start || filterValue.end) && "text-blue-600 opacity-100")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm leading-none text-slate-600 mb-1">Filter {title}</h4>
                    <div className="flex flex-col gap-2">
                        {/* Start Date */}
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">After</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "h-8 w-[200px] justify-start text-left font-normal text-xs",
                                            !filterValue.start && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {filterValue.start ? format(new Date(filterValue.start), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={filterValue.start ? new Date(filterValue.start) : undefined}
                                        onSelect={(date) => setFilter('start', date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Before</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "h-8 w-[200px] justify-start text-left font-normal text-xs",
                                            !filterValue.end && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {filterValue.end ? format(new Date(filterValue.end), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={filterValue.end ? new Date(filterValue.end) : undefined}
                                        onSelect={(date) => setFilter('end', date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    {(filterValue.start || filterValue.end) && (
                        <div className="pt-1">
                            <Button variant="ghost" size="sm" onClick={clearFilter} className="h-7 w-full text-xs hover:bg-slate-100 text-slate-500">
                                Clear Filter
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
