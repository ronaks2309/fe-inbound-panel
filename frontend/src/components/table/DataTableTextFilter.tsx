import React from "react"
import { Search } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { Input } from "../ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover"
import { Button } from "../ui/button"

interface DataTableTextFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
}

export function DataTableTextFilter<TData, TValue>({
    column,
    title,
}: DataTableTextFilterProps<TData, TValue>) {
    const columnFilterValue = column?.getFilterValue() as string

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 data-[state=open]:bg-accent">
                    <Search className="h-4 w-4 text-slate-500" />
                    <span className="sr-only">Filter {title}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm leading-none mb-2 text-slate-600">Filter {title}</h4>
                    <Input
                        placeholder={`Filter ${title}...`}
                        value={columnFilterValue ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            column?.setFilterValue(event.target.value)
                        }
                        className="h-8 w-full"
                        autoFocus
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
