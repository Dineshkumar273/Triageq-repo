export default function StatusBadge({ status }) {
  return (
    <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
      {status}
    </span>
  );
}