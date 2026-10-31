const Timepicker = (props: {
  from: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  value: number;
  label: string;
  id?: string;
}) => {
  // "From" offers 00:00–23:00, "to" offers 01:00–24:00.
  const hours = props.from
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 24 }, (_, i) => i + 1);

  return (
    <select
      id={props.id ?? (props.from ? "timepicker__from" : "timepicker__to")}
      aria-label={props.label}
      className="p-2 text-lg text-dark bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
      value={props.value}
      onChange={props.onChange}
    >
      {hours.map((i) => (
        <option key={i} value={i}>{`${String(i).padStart(2, "0")}:00`}</option>
      ))}
    </select>
  );
};

export default Timepicker;
