import React from "react";
import HistoryClient from "./HistoryClient";

export function generateStaticParams() {
  return [{ id: 'default' }, { id: 'demo' }, { id: '1' }];
}

export default function BoardHistoryPage() {
  return <HistoryClient />;
}
