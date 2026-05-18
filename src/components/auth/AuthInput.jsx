export default function AuthInput({ id, label, type = 'text', ...inputProps }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type={type} {...inputProps} />
    </label>
  );
}
