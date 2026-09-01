import React from "react";
import ShareClient from "./ShareClient";

export function generateStaticParams() {
  return [{ id: 'default' }, { id: 'demo' }, { id: '1' }];
}

export default function ShareBoardPage() {
  return <ShareClient />;
}
