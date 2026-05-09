"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AdminClickableProfileRowProps {
  href: string;
  cells: Array<{
    key: string;
    content: ReactNode;
  }>;
}

export default function AdminClickableProfileRow({
  href,
  cells,
}: AdminClickableProfileRowProps) {
  const router = useRouter();

  const navigate = () => {
    router.push(href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  };

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition-colors hover:bg-rose-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-inset"
    >
      {cells.map((cell) => (
        <td key={cell.key} className="px-4 py-4 align-middle">
          {cell.content}
        </td>
      ))}
    </tr>
  );
}
