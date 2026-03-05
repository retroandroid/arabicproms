import React from "react";
import { QuestionnairesProvider } from "./state/questionnairesStore";
import { AppShell } from "./ui/AppShell";
import { QuestionnairePicker } from "./ui/QuestionnairePicker";
import { QuestionnaireRunner } from "./ui/QuestionnaireRunner";

export default function App() {
  return (
    <QuestionnairesProvider>
      <AppShell>
        <QuestionnairePicker />
        <QuestionnaireRunner />
      </AppShell>
    </QuestionnairesProvider>
  );
}