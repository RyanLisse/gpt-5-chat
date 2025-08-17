'use client';

import { useTheme } from 'next-themes';
import { parse, unparse } from 'papaparse';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import DataGrid, { textEditor } from 'react-data-grid';
import { cn } from '@/lib/utils';

import 'react-data-grid/lib/styles.css';

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  status: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  isReadonly?: boolean;
};

const MIN_ROWS = 50;
const MIN_COLS = 26;

// Helper function to create empty data structure
function createEmptyData(): string[][] {
  return new Array(MIN_ROWS).fill(new Array(MIN_COLS).fill(''));
}

// Helper function to pad data to minimum dimensions
function padDataToMinimums(data: string[][]): string[][] {
  const paddedData = data.map((row) => {
    const paddedRow = [...row];
    while (paddedRow.length < MIN_COLS) {
      paddedRow.push('');
    }
    return paddedRow;
  });

  while (paddedData.length < MIN_ROWS) {
    paddedData.push(new Array(MIN_COLS).fill(''));
  }

  return paddedData;
}

// Helper function to create column definitions
function createColumns(isReadonly: boolean) {
  const rowNumberColumn = {
    key: 'rowNumber',
    name: '',
    frozen: true,
    width: 50,
    renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
    cellClass: 'border-t border-r dark:bg-zinc-950 dark:text-zinc-50',
    headerCellClass: 'border-t border-r dark:bg-zinc-900 dark:text-zinc-50',
  };

  const dataColumns = Array.from({ length: MIN_COLS }, (_, i) => ({
    key: i.toString(),
    name: String.fromCharCode(65 + i),
    renderEditCell: isReadonly ? undefined : textEditor,
    width: 120,
    cellClass: cn(`border-t dark:bg-zinc-950 dark:text-zinc-50`, {
      'border-l': i !== 0,
    }),
    headerCellClass: cn(`border-t dark:bg-zinc-900 dark:text-zinc-50`, {
      'border-l': i !== 0,
    }),
  }));

  return [rowNumberColumn, ...dataColumns];
}

const PureSpreadsheetEditor = ({
  content,
  saveContent,
  status: _status,
  isCurrentVersion: _isCurrentVersion,
  isReadonly,
}: SheetEditorProps) => {
  const { theme } = useTheme();

  const parseData = useMemo(() => {
    if (!content) {
      return createEmptyData();
    }

    const result = parse<string[]>(content, { skipEmptyLines: true });
    return padDataToMinimums(result.data);
  }, [content]);

  const columns = useMemo(
    () => createColumns(isReadonly ?? false),
    [isReadonly],
  );

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || '';
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const handleRowsChange = useCallback(
    (newRows: any[]) => {
      if (isReadonly) {
        return;
      }

      setLocalRows(newRows);

      const updatedData = newRows.map((row) => {
        return columns.slice(1).map((col) => row[col.key] || '');
      });

      const newCsvContent = unparse(updatedData);
      saveContent(newCsvContent, true);
    },
    [isReadonly, columns, saveContent],
  );

  const handleCellClick = useCallback(
    (args: any) => {
      if (args.column.key !== 'rowNumber' && !isReadonly) {
        args.selectCell(true);
      }
    },
    [isReadonly],
  );

  return (
    <DataGrid
      className={theme === 'dark' ? 'rdg-dark' : 'rdg-light'}
      columns={columns}
      defaultColumnOptions={{
        resizable: true,
        sortable: true,
      }}
      enableVirtualization
      onCellClick={handleCellClick}
      onRowsChange={isReadonly ? undefined : handleRowsChange}
      rows={localRows}
      style={{ height: '100%' }}
    />
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent &&
    prevProps.isReadonly === nextProps.isReadonly
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
