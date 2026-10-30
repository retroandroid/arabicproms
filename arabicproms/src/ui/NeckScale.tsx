import type { Option, OptionValue } from "../core/types";

type Props = {
  name: string;
  options: Option[];
  value: OptionValue | undefined;
  onChange: (value: OptionValue) => void;
};

export function NeckScale({ name, options, value, onChange }: Props) {
  const sorted = [...options].sort((a, b) => Number(a.value) - Number(b.value));
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return (
    <div className="neck-scale">
      <div className="neck-scale-values" dir="ltr">
        {sorted.map((option) => (
          <label key={option.value} className="neck-scale-choice">
            <span>{option.value}</span>
            <input
              type="radio" name={name} value={option.value} required
              aria-label={option.label_ar === String(option.value)
                ? String(option.value) : `${option.value} (${option.label_ar})`}
              checked={value === option.value} onChange={() => onChange(option.value)}
            />
          </label>
        ))}
      </div>
      <div className="neck-scale-anchors" dir="ltr">
        <bdi dir="auto">{low && low.label_ar !== String(low.value) ? low.label_ar : ""}</bdi>
        <bdi dir="auto">{high && high.label_ar !== String(high.value) ? high.label_ar : ""}</bdi>
      </div>
    </div>
  );
}
