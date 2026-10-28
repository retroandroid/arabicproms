import { DOMINANT_HAND_FIELD } from "../questionnaires/patientFields";
import { PatientChoices } from "./PatientChoices";

export type PssPatient = {
  name: string;
  birthDate: string;
  gender: string;
  phone: string;
  dominantHand: string;
  shoulderProblem: string;
};

type Props = {
  patient: PssPatient;
  onChange: (field: keyof PssPatient, value: string) => void;
};

const choiceFields = {
  gender: { number: 3, label: "الجنس", options: ["ذكر", "أنثى"] },
  dominantHand: { number: 5, label: DOMINANT_HAND_FIELD.label_ar, options: DOMINANT_HAND_FIELD.options },
  shoulderProblem: { number: 6, label: "هل لديك مشكلة في أحد كتفيك أو كلاهما؟", options: ["نعم", "لا"] },
};

export function PssPatientDetails({ patient, onChange }: Props) {
  function renderInput(field: "name" | "birthDate" | "phone", number: number, label: string, type: string) {
    return (
      <div className="question-card patient-field">
        <label htmlFor={`pss-${field}`} className="patient-label">
          {number}. {label} <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <input
          id={`pss-${field}`}
          name={`pss-${field}`}
          className="input patient-input"
          type={type}
          autoComplete={field === "name" ? "name" : field === "birthDate" ? "bday" : "tel"}
          dir={field === "name" ? "rtl" : "ltr"}
          required
          value={patient[field]}
          onChange={(event) => onChange(field, event.target.value)}
        />
      </div>
    );
  }

  function renderChoices(field: keyof typeof choiceFields) {
    const { number, label, options } = choiceFields[field];
    return (
      <PatientChoices
        number={number} label={label} name={`pss-${field}`} options={options}
        value={patient[field]} onChange={(value) => onChange(field, value)}
      />
    );
  }

  return (
    <section className="patient-details" aria-labelledby="patient-details-title">
      <h3 id="patient-details-title">معلومات عامة</h3>
      <p>من فضلك، خذ وقتك لملء المعلومات العامة عنك.</p>
      {renderInput("name", 1, "اسم المريض", "text")}
      {renderInput("birthDate", 2, "تاريخ الولادة", "date")}
      {renderChoices("gender")}
      {renderInput("phone", 4, "رقم الهاتف", "tel")}
      {renderChoices("dominantHand")}
      <h3>١. الكتف</h3>
      {renderChoices("shoulderProblem")}
    </section>
  );
}
