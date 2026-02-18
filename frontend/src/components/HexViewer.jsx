import { ScrollArea } from "@/components/ui/scroll-area";

export default function HexViewer({ data, title }) {
  // Convert string to hex representation
  const toHex = (str) => {
    if (!str) return [];
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase());
    }
    return bytes;
  };

  const hexBytes = toHex(data);
  const rows = [];
  
  for (let i = 0; i < hexBytes.length; i += 16) {
    const rowBytes = hexBytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, '0').toUpperCase();
    const hex = rowBytes.join(' ').padEnd(47, ' ');
    const ascii = data?.slice(i, i + 16)
      .split('')
      .map(c => {
        const code = c.charCodeAt(0);
        return code >= 32 && code <= 126 ? c : '.';
      })
      .join('') || '';
    
    rows.push({ offset, hex, ascii });
  }

  return (
    <div className="data-panel" data-testid="hex-viewer">
      {title && (
        <div className="data-panel-header">
          <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        </div>
      )}
      <ScrollArea className="h-48">
        <div className="hex-viewer p-3">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No data to display</p>
          ) : (
            rows.map((row, idx) => (
              <div 
                key={idx} 
                className="row flex gap-4 py-1 hover:bg-primary/5"
              >
                <span className="text-primary w-20">{row.offset}</span>
                <span className="text-foreground flex-1">{row.hex}</span>
                <span className="text-muted-foreground w-20">{row.ascii}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
