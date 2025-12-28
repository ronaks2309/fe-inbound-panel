import { Filter } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
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
    const filterValue = (column?.getFilterValue() as { start?: string; end?: string }) || {}

    const setFilter = (key: 'start' | 'end', val: string) => {
        const newVal = { ...filterValue, [key]: val ? val : undefined };
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Filter Date">
                    <Filter className={cn("h-4 w-4 opacity-50", (filterValue.start || filterValue.end) && "text-blue-600 opacity-100")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none">Filter {title}</h4>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start-date" className="col-span-1">After</Label>
                            <input
                                type="datetime-local"
                                id="start-date"
                                className="col-span-3 h-8 rounded border border-slate-300 px-2 text-xs"
                                value={filterValue.start || ''}
                                onChange={(e) => setFilter('start', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end-date" className="col-span-1">Before</Label>
                            <input
                                type="datetime-local"
                                id="end-date"
                                className="col-span-3 h-8 rounded border border-slate-300 px-2 text-xs"
                                value={filterValue.end || ''}
                                onChange={(e) => setFilter('end', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <Button variant="outline" size="sm" onClick={clearFilter}>Clear</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
