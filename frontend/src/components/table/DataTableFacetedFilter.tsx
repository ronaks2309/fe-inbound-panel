import * as React from "react"
import { Check, Filter } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "../ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover"

interface DataTableFacetedFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
    options: {
        label: string
        value: string
        icon?: React.ComponentType<{ className?: string }>
    }[]
}

export function DataTableFacetedFilter<TData, TValue>({
    column,
    title,
    options,
}: DataTableFacetedFilterProps<TData, TValue>) {
    const facets = column?.getFacetedUniqueValues()
    const selectedValues = new Set(column?.getFilterValue() as string[])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Filter">
                    <Filter className={cn("h-4 w-4 opacity-50", selectedValues.size > 0 && "text-blue-600 opacity-100")} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.has(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            if (isSelected) {
                                                selectedValues.delete(option.value)
                                            } else {
                                                selectedValues.add(option.value)
                                            }
                                            const filterValues = Array.from(selectedValues)
                                            column?.setFilterValue(
                                                filterValues.length ? filterValues : undefined
                                            )
                                        }}
                                        className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-300 transition-colors",
                                                isSelected
                                                    ? "bg-slate-800 border-slate-800 text-white"
                                                    : "bg-white text-transparent [&_svg]:invisible hover:border-slate-500"
                                            )}
                                        >
                                            <Check className={cn("h-3 w-3 stroke-[3]")} />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-slate-600" />
                                        )}
                                        <span className="text-sm font-medium text-slate-900">{option.label}</span>
                                        {facets?.get(option.value) && (
                                            <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1 font-mono text-[10px] font-medium text-slate-600">
                                                {facets.get(option.value)}
                                            </span>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>

                    </CommandList>
                    {selectedValues.size > 0 && (
                        <div className="p-1">
                            <CommandSeparator />
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => column?.setFilterValue(undefined)}
                                className="flex w-full cursor-pointer select-none items-center justify-center rounded-sm px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none"
                            >
                                Clear filters
                            </div>
                        </div>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    )
}
