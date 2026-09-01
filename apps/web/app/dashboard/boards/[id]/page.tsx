import React from "react";
import SavedBoardRedirectClient from "./SavedBoardRedirectClient";

export function generateStaticParams() {
  return [{ id: 'default' }, { id: 'demo' }, { id: '1' }];
}

export default function SavedBoardRedirectPage() {
  return <SavedBoardRedirectClient />;
}
