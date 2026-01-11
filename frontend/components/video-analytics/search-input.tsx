"use client";

import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search history" }: SearchInputProps) {
    return (
        <InputGroup>
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </InputGroup>
    );
}
