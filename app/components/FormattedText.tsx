// Turns **bold** markers into real <strong> text — the one bit of
// formatting BoldableTextarea's admin toolbar writes. Not a markdown
// parser: anything else (links, lists, etc.) just renders as plain text.
export default function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
    </>
  );
}
