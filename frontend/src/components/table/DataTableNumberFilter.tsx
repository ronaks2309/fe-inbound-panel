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

interface DataTableNumberFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
}

export function DataTableNumberFilter<TData, TValue>({
    column,
    title,
}: DataTableNumberFilterProps<TData, TValue>) {
    // Simple filter state: { min: number | null, max: number | null }
    const filterValue = (column?.getFilterValue() as { min?: number; max?: number }) || {}

    const setFilter = (key: 'min' | 'max', val: string) => {
        const num = val ? Number(val) : undefined;
        const newVal = { ...filterValue, [key]: num };
        if (newVal.min === undefined && newVal.max === undefined) {
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Filter Number">
                    <Filter className={cn("h-4 w-4 opacity-50", (filterValue.min !== undefined || filterValue.max !== undefined) && "text-blue-600 opacity-100")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none">Filter {title}</h4>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="min-val" className="col-span-1">Min</Label>
                            <input
                                type="number"
                                id="min-val"
                                className="col-span-3 h-8 rounded border border-slate-300 px-2 text-xs"
                                placeholder="Seconds"
                                value={filterValue.min ?? ''}
                                onChange={(e) => setFilter('min', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="max-val" className="col-span-1">Max</Label>
                            <input
                                type="number"
                                id="max-val"
                                className="col-span-3 h-8 rounded border border-slate-300 px-2 text-xs"
                                placeholder="Seconds"
                                value={filterValue.max ?? ''}
                                onChange={(e) => setFilter('max', e.target.value)}
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
