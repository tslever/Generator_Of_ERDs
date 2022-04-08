import { Inject, Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { builderKey } from '../models/builder.model';
import { Column } from '../models/column.model';
import { Highlighted, highlightedKey } from '../models/highlighted.model';
import { Position } from '../models/position.model';
import { Relation, relationStateKey } from '../models/relation.model';
import { Rename, renameKey } from '../models/rename.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';
import { StateInjector } from './state.token';

@Injectable({
  providedIn: 'root'
})
export class BuilderService {
  private tableIndex = -1;
  private columnIndex = -1;

  constructor(
    @Inject(StateInjector(builderKey)) private readonly tableState: State<Table[]>,
    @Inject(StateInjector(relationStateKey)) private readonly relationState: State<Relation[]>,
    @Inject(StateInjector(highlightedKey)) private readonly highlightedState: State<Highlighted>,
    @Inject(StateInjector(renameKey)) public readonly renameState: State<Rename>,

  ) {
    this.tableState.set([]);
  }
  public setTables(tables: Table[]): void {
    this.tableState.set([...tables]);
  }
  public async addTable(
    table: Table = new Table('untitled' + this.tableIndex++, 'dbo'),
    position: Position = { x: 0, y: 0 }): Promise<void> {
    const tables = await this.getTables();
    table.setPosition(position.x, position.y);
    this.highlightedState.set(table);
    tables.push(table);
    this.tableState.set(tables);
    this.renameState.set({ table, position: { x: table.x, y: table.y } });

  }

  public async renameTable(table: Table, newName: string): Promise<void> {
    const tables = await this.getTables();
    const tableIndex = tables.findIndex(t => t.name === table.name && t.schema === table.schema);
    tables[tableIndex].name = newName;
    this.tableState.set(tables);
    this.highlightedState.set(table);
  }
  public async addColumn(table: Table, columnName: string): Promise<void> {
    const tables = await this.getTables();
    const tableRef = tables?.find(t => t.name === table.name && t.schema === table.schema);
    if (!tableRef) { return; }

    const column = new Column(
      tableRef.columns.length,
      tableRef,
      columnName);

    tableRef.columns.push(column);
    this.tableState.set(tables);
    this.highlightedState.set(column);
    this.renameState.set({ column, table, position: { x: column.x, y: column.y } });
  }

  public async addRelation(from: Column, to: Column): Promise<void> {
    const relations = await this.relationState.select$.pipe(take(1)).toPromise();
    const tables = await this.getTables();

    const fromTable = tables.find(x => x.name === from.table.name && x.schema === from.table.schema);
    const toTable = tables.find(x => x.name === to.table.name && x.schema === to.table.schema);

    const relation = new Relation(from, to);
    fromTable?.fromRelations.push(relation);
    toTable?.toRelations.push(relation);
    this.relationState.set([...relations ?? [], relation]);
    this.tableState.set([...tables]);
    this.highlightedState.set(from);
  }

  public async renameColumn(table: Table, column: Column, newName: string): Promise<void> {
    const tables = await this.getTables();

    const tableRef = tables.find(t => t.name === table.name && t.schema === table.schema);
    if (!tableRef) { return; }

    tableRef.columns[column.index].name = newName;

    this.tableState.set(tables);
    this.highlightedState.set(column);
  }
  private async getTables(): Promise<Table[]> {
    const tables = await this.tableState.select$.pipe(take(1)).toPromise();

    return [...tables ?? []];
  }
}
