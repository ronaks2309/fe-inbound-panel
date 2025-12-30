import { Filter } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={`Filter ${title}`}>
                    <Filter className={cn("h-4 w-4 opacity-50", (filterValue.min !== undefined || filterValue.max !== undefined) && "text-blue-600 opacity-100")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm leading-none text-slate-600 mb-1">Filter {title}</h4>
                    <div className="flex flex-row gap-2">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="min-val" className="text-xs text-muted-foreground">Min</Label>
                            <Input
                                type="number"
                                id="min-val"
                                className="h-8 w-24 text-xs"
                                placeholder="Min"
                                value={filterValue.min ?? ''}
                                onChange={(e) => setFilter('min', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="max-val" className="text-xs text-muted-foreground">Max</Label>
                            <Input
                                type="number"
                                id="max-val"
                                className="h-8 w-24 text-xs"
                                placeholder="Max"
                                value={filterValue.max ?? ''}
                                onChange={(e) => setFilter('max', e.target.value)}
                            />
                        </div>
                    </div>
                    {(filterValue.min !== undefined || filterValue.max !== undefined) && (
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
