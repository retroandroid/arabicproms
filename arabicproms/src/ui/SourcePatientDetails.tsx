import type { PatientField } from "../questionnaires/patientFields";
import { PatientChoices } from "./PatientChoices";

type Props = {
  questionnaireId: string;
  fields: PatientField[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

export function SourcePatientDetails({ questionnaireId, fields, values, onChange }: Props) {
  const prefix = questionnaireId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const headingId = `${prefix}-patient-title`;
  return (
    <section className="patient-details" aria-labelledby={headingId}>
      <h3 id={headingId}>معلومات عامة</h3>
      <p>من فضلك، خذ وقتك لملء المعلومات العامة عنك.</p>
      {fields.map((field, index) => {
        const id = `${prefix}-patient-${field.id}`;
        if (field.type === "radio") return (
          <PatientChoices
            key={field.id} number={index + 1} label={field.label_ar} name={id}
            options={field.options} value={values[field.id]}
            onChange={(value) => onChange(field.id, value)}
          />
        );
        return (
          <div key={field.id} className="question-card patient-field">
            <label htmlFor={id} className="patient-label">
              {index + 1}. {field.label_ar} <span className="required-mark" aria-hidden="true">*</span>
            </label>
            <input
              id={id} name={id} type={field.type} autoComplete={field.autoComplete}
              className="input patient-input" required
              dir={field.type === "text" ? "rtl" : "ltr"}
              value={values[field.id] ?? ""}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          </div>
        );
      })}
    </section>
  );
}
