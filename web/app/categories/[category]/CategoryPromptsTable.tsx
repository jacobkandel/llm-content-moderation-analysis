'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';

interface Prompt {
    id: string;
    text: string;
    category: string;
    source: string;
}

export const columns: ColumnDef<Prompt>[] = [
    {
        accessorKey: 'id',
        header: ({ column }) => <SortableHeader column={column} title="ID" />,
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue('id')}</span>,
    },
    {
        accessorKey: 'text',
        header: ({ column }) => <SortableHeader column={column} title="Prompt" />,
        cell: ({ row }) => <span className="text-foreground font-medium">{row.getValue('text')}</span>,
    },
    {
        accessorKey: 'source',
        header: ({ column }) => <SortableHeader column={column} title="Source" />,
        cell: ({ row }) => {
            const source = row.getValue('source') as string;
            return (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 whitespace-nowrap">
                    {source}
                </span>
            );
        },
    },
];

interface CategoryPromptsTableProps {
    prompts: Prompt[];
}

export function CategoryPromptsTable({ prompts }: CategoryPromptsTableProps) {
    if (!prompts || prompts.length === 0) return null;

    return (
        <section className="mt-12 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
                Evaluated Prompts ({prompts.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
                These are the specific prompts used to test models for this category. You can search for keywords.
            </p>
            <DataTable
                columns={columns}
                data={prompts}
                searchKey="text"
                exportFilename="category_prompts"
                emptyState={{
                    title: "No prompts found",
                    description: "There are no prompts available for this category.",
                    icon: "search"
                }}
            />
        </section>
    );
}
