"use client";

import React from "react";

// The row-selection checkbox react-table drives: checked, unchecked, or the
// indeterminate header state that no React prop can set declaratively.
const RowSelectCheckbox = React.forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = React.useRef();
  const resolvedRef = ref || defaultRef;

  React.useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return <input type="checkbox" ref={resolvedRef} {...rest} className="table-checkbox" />;
});

RowSelectCheckbox.displayName = "RowSelectCheckbox";

export default RowSelectCheckbox;
