type Props = {
  number?: number;
  label: string;
  name: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (value: string) => void;
  required?: boolean;
};

export function PatientChoices({ number, label, name, options, value, onChange, required = true }: Props) {
  return (
    <fieldset className="question-card pss-question">
      <legend className="patient-label">
        {number === undefined ? "" : `${number}. `}{label} {required ? <span className="required-mark" aria-hidden="true">*</span> : null}
      </legend>
      <p className="single-choice-hint">اختر إجابة واحدة فقط.</p>
      <div className="pss-choices">
        {options.map((option, index) => (
          <label key={option} htmlFor={`${name}-${index}`} className="pss-choice">
            <input
              id={`${name}-${index}`} type="radio" name={name} value={option}
              checked={value === option} onChange={() => onChange(option)} required={required}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
