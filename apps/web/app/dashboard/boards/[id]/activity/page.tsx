import React from "react";
import ActivityClient from "./ActivityClient";

export function generateStaticParams() {
  return [{ id: 'default' }, { id: 'demo' }, { id: '1' }];
}

export default function BoardActivityPage() {
  return <ActivityClient />;
}
