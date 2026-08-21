/**
 * Recursively extracts all files from dropped DataTransfer items,
 * supporting full folder hierarchy through webkitGetAsEntry.
 */
export async function getFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<Array<{ file: File; relativePath?: string }>> {
  const items = dataTransfer.items;
  if (!items || items.length === 0) {
    const rawFiles = Array.from(dataTransfer.files || []);
    return rawFiles.map(file => ({ file, relativePath: file.name }));
  }

  const results: Array<{ file: File; relativePath?: string }> = [];

  const traverseFileTree = async (entry: any, currentPath = ''): Promise<void> => {
    if (!entry) return;

    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file((file: File) => {
          results.push({
            file,
            relativePath: currentPath ? `${currentPath}/${file.name}` : file.name
          });
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = async (): Promise<void> => {
        return new Promise<void>((resolve) => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              for (const childEntry of entries) {
                await traverseFileTree(childEntry, newPath);
              }
              // readEntries must be called repeatedly until it returns an empty array in WebKit
              await readEntries();
              resolve();
            }
          }, () => resolve());
        });
      };
      await readEntries();
    }
  };

  const entryPromises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry) {
        entryPromises.push(traverseFileTree(entry));
      } else {
        const file = item.getAsFile();
        if (file) {
          results.push({ file, relativePath: file.name });
        }
      }
    }
  }

  await Promise.all(entryPromises);
  return results.length > 0 ? results : Array.from(dataTransfer.files || []).map(f => ({ file: f, relativePath: f.name }));
}
