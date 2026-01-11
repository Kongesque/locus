"use client";

import { Download, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface HistoryItem {
    id: string;
    name: string;
    createdAt: string;
    duration: string;
    format: string;
}

interface HistoryTableProps {
    data: HistoryItem[];
}

export function HistoryTable({ data }: HistoryTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="w-28 text-muted-foreground">Duration</TableHead>
                    <TableHead className="w-28 text-muted-foreground">Format</TableHead>
                    <TableHead className="w-10"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length > 0 ? (
                    data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                                        <Play className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.createdAt}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                                {item.duration}
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                                {item.format}
                            </TableCell>

                            <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <span className="text-muted-foreground">No results found.</span>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
