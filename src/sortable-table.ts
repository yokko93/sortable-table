type SortDirection = 'asc' | 'desc';

type Column = {
  id: string;
  label: string;
  sortable: boolean;
  sortDirection: SortDirection;
};

type Row = {
  [key: string]: Cell;
}

type Cell = {
  value: string;
  cellRenderer: (value: string) => string;
}

interface ISortableTable {
  tableElement: Element;
  header: Array<Column>;
  columnIds: Array<string>;
  originalData: Array<Row>;
  selectedColumnId: string;
  setHeader: Function;
  setData: Function;
  getTableData: Function;
}

export default class SortableTable implements ISortableTable {
  tableElement: Element;
  header: Array<Column>;
  columnIds: Array<string>;
  originalData: Array<Row>;
  displayData: Array<Row>;
  selectedColumnId: string;

  constructor(selector: string) {
    const tableElement = document.querySelector(selector);
    if (!tableElement) {
      throw new Error('Table element not found.')
    }
    this.tableElement = tableElement;
    this.header = [];
    this.columnIds = [];
    this.originalData = [];
    this.displayData = [];
    this.selectedColumnId = '';
  }

  /**
   * ヘッダを設定します。
   *
   * @param header ヘッダデータ
   */
  public setHeader(header: Array<Column>): void {
    if (!header) return;
    this.header = header;
    for (const column of header) {
      this.columnIds.push(column.id);
    }
    this.renderHeader();
    this.setupEventListner();
  }

  /**
   * 表のデータを設定します。
   *
   * @param data 表データ
   */
  public setData(data: Array<Row>): void {
    if (!data) return;
    this.originalData = data;
    this.displayData = data;
    this.renderData(data);
  }

  /**
   * 表示しているテーブルデータを取得します。
   *
   * @returns 表示しているテーブルデータ
   */
  public getTableData(): Array<Row> {
    return this.displayData;
  }

  /**
   * ヘッダを描画します。
   */
  private renderHeader(): void {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    const row = this.tableElement.appendChild(thead).appendChild(tr);

    this.header.forEach((column) => {
      const th = document.createElement('th');
      th.id = column.id;
      th.innerText = column.label;
      if (column.sortable) {
        th.setAttribute('sortable', '')
      }
      th.setAttribute('data-id', column.id);
      row.appendChild(th);
    });
  }

  /**
   * データを描画します。
   */
  private renderData(data: Array<Row>): void {
    const tbody = document.createElement('tbody');
    for (const row of data) {
      const tr = document.createElement('tr');
      for (const key of this.columnIds) {
        const td = document.createElement('td');
        const value = row[key].value.toString();
        const cellRenderer = row[key].cellRenderer;
        if (cellRenderer) {
          td.innerHTML = cellRenderer(value);
        } else {
          td.innerText = value;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    this.tableElement.appendChild(tbody);
  }

  /**
   * データをソートします。
   * @param columnId ソート対象カラムID
   */
  private sort(columnId: string): void {
    const colmunElement = this.tableElement.querySelector(`[data-id="${columnId}"]`);
    if (!colmunElement) {
      throw Error(`data-id "${columnId}" is not found.`);
    }

    const column = this.getHeaderColmun(columnId);
    if (!column) {
      throw Error(`data-id "${columnId}" is not found.`);
    }

    this.clearSortDirection();

    if (this.selectedColumnId === columnId) {
      column.sortDirection = this.getInversedSortDirection(column.sortDirection);
    } else {
      this.selectedColumnId = columnId;
      column.sortDirection = 'asc';
    }

    colmunElement.classList.add(`sort-${column.sortDirection}`);

    this.clearTableRow();

    const sortedData = this._sort(columnId, column.sortDirection);
    this.displayData = sortedData;
    this.renderData(sortedData);
  }

  /**
   * データをソートします。
   *
   * @param columnId ソートするカラムID
   * @param direction ソート順
   * @returns ソートした配列
   */
  private _sort(columnId: string, direction: SortDirection): Array<Row> {
    const sign = direction === 'asc' ? 1 : -1;
    return this.originalData.sort((a, b) => {
      let valA: string | number = a[columnId].value;
      let valB: string | number = b[columnId].value;

      // 数値にキャストできる値（半角数字と,のみ）の場合、カンマを除いた数値でソートする
      if (this.canCastToNumber(valA) && this.canCastToNumber(valB)) {
        valA = Number(this.removeCommas(String(valA)));
        valB = Number(this.removeCommas(String(valB)));
      }

      if (valA < valB) {
        return sign * -1;
      }
      if (valA > valB) {
        return sign;
      }
      return 0;
    });
  }

  /**
   * ヘッダからカラムを取得します。
   * 取得できなかった場合、undefinedを返します。
   *
   * @param columnId カラムID
   */
  private getHeaderColmun(columnId: string): Column | undefined {
    return this.header.find((column) => column.id = columnId);
  }

  /**
   * thタグのソート状態をクリアします。
   */
  private clearSortDirection(): void {
    for (const th of this.tableElement.querySelectorAll('th')) {
      th.classList.remove('sort-desc');
      th.classList.remove('sort-asc');
    }
  }

  /**
   * 引数に指定したソートの逆を返却します。
   *
   * @param direction ソート順
   * @returns ソート順
   */
  private getInversedSortDirection(direction: SortDirection): SortDirection {
    return !direction || direction === 'desc' ? 'asc' : 'desc';
  }

  /**
   * テーブル行を全て消します。
   */
  private clearTableRow(): void {
    const tbody = this.tableElement.querySelector('tbody');
    if (tbody) {
      this.tableElement.removeChild(tbody);
    }
  }

  /**
   * ソート可能カラムのヘッダにイベントリスナーを設定します。
   */
  private setupEventListner(): void {
    for (const column of this.header) {
      const th = document.getElementById(column.id);
      if (!th) continue;

      if (column.sortable) {
        th.classList.add('sortable');
        const listener = this.onSort.bind(this);
        th.removeEventListener('click', listener);
        th.addEventListener('click', listener);
        th.classList.add('sort');
      }
    }
  }

  /**
   * ソートイベント
   * @param e イベント
   */
  private onSort(e: Event): void {
    const target = e.currentTarget;
    if (!target) {
      throw Error('sort target not found.');
    }
    const element = target as HTMLElement;
    this.sort(element.getAttribute('data-id') ?? '');
  }

  /**
   * 文字列がNumberにキャストできるか判定します。
   * 半角数字と,のみで構成される場合、キャスト可能と判定します。
   *
   * @param str 検査対象文字列
   * @returns true: キャスト可、false: キャスト不可
   */
  private canCastToNumber(str: string): boolean {
    const pattern = /^[0-9,]+$/;
    return pattern.test(str);
  }

  /**
   * 文字列中からカンマを削除します。
   *
   * @param str 削除対象文字列
   * @returns カンマを削除した文字列
   */
  private removeCommas(str: string): string {
    return str.replace(/,/g, '');
  }
}
