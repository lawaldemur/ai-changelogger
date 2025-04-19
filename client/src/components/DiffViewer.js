import React from "react";

function DiffViewer({ file }) {
    const getDiffWithContext = (diff, contextLines = 3) => {
        const lines = diff.map((part, index) => ({ ...part, index }));
        const changedIndices = lines
            .filter((part) => part.type !== "unchanged")
            .map((part) => part.index);

        if (changedIndices.length === 0) {
            return diff;
        }

        const contextIndices = new Set();
        changedIndices.forEach((index) => {
            for (
                let i = Math.max(0, index - contextLines);
                i <= Math.min(lines.length - 1, index + contextLines);
                i++
            ) {
                contextIndices.add(i);
            }
        });

        const filteredLines = lines
            .filter((_, index) => contextIndices.has(index))
            .map(({ type, value }) => ({ type, value }));

        // Add separator lines between non-consecutive sections
        const result = [];
        let lastIndex = -2;

        filteredLines.forEach((line, index) => {
            if (index > 0 && index - lastIndex > 1) {
                result.push({ type: "separator", value: "..." });
            }
            result.push(line);
            lastIndex = index;
        });

        return result;
    };

    const diffLines = getDiffWithContext(file.diff);

    return (
        <>
            <h3>Changes in {file.path}</h3>
            <div className="diff">
                <pre>
                    {diffLines.map((part, index) => (
                        <div
                            key={index}
                            className={`diff-line ${
                                part.type === "separator"
                                    ? "separator"
                                    : part.type
                            }`}
                        >
                            {part.value}
                        </div>
                    ))}
                </pre>
            </div>
        </>
    );
}

export default DiffViewer;
