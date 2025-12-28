import {
    ArrowDownIcon,
    ArrowUpIcon,
    ChevronsUpDown,
} from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { cn } from "../../lib/utils"
// import { Button } from "../ui/button" // Unused

// DataTableColumnHeader uses simple toggle button for sort and passed component for filter.
// No internal DropdownMenu required.

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
    filterComponent?: React.ReactNode // Pass the specific filter component here to render in the popover
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
    filterComponent,
}: DataTableColumnHeaderProps<TData, TValue>) {
    if (!column.getCanSort() && !column.getCanFilter()) {
        return <div className={cn(className)}>{title}</div>
    }

    const toggleSort = () => {
        const isSorted = column.getIsSorted();
        if (isSorted === 'asc') {
            column.toggleSorting(true); // desc
        } else if (isSorted === 'desc') {
            column.clearSorting();
        } else {
            column.toggleSorting(false); // asc
        }
    }

    return (
        <div className={cn("flex items-center space-x-1 whitespace-nowrap", className)}>
            <div className="flex items-center space-x-1 group">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors cursor-pointer select-none" onClick={toggleSort}>
                    {title}
                </span>

                {/* Sort Indicator - only show on hover or when sorted */}
                {column.getCanSort() && (
                    <div onClick={toggleSort} className={cn("cursor-pointer rounded hover:bg-slate-100 p-0.5", column.getIsSorted() ? "opacity-100" : "opacity-0 group-hover:opacity-50 transition-opacity")}>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDownIcon className="h-3 w-3 text-emerald-600" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUpIcon className="h-3 w-3 text-emerald-600" />
                        ) : (
                            <ChevronsUpDown className="h-3 w-3 text-slate-400" />
                        )}
                    </div>
                )}

                {/* Filter Trigger - Compact */}
                {column.getCanFilter() && filterComponent ? (
                    <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity", column.getIsFiltered() && "opacity-100")}>
                        {filterComponent}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
