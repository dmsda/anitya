import { getDB } from './db';
import type { Collection } from '../schemas/types';

export class CollectionRepository {
  static async getAll(): Promise<Collection[]> {
    const db = await getDB();
    const list = await db.getAll('collections');
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getById(id: string): Promise<Collection | undefined> {
    const db = await getDB();
    return db.get('collections', id);
  }

  static async create(data: { name: string; description?: string; color?: string }): Promise<Collection> {
    const now = Date.now();
    const item: Collection = {
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      name: data.name.trim(),
      description: data.description?.trim(),
      color: data.color || '#6366f1',
      createdAt: now,
      updatedAt: now,
    };
    const db = await getDB();
    await db.put('collections', item);
    return item;
  }

  static async update(id: string, data: Partial<Omit<Collection, 'id' | 'createdAt'>>): Promise<Collection | undefined> {
    const db = await getDB();
    const item = await db.get('collections', id);
    if (!item) return undefined;
    const updated: Collection = {
      ...item,
      ...data,
      updatedAt: Date.now(),
    };
    await db.put('collections', updated);
    return updated;
  }

  static async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('collections', id);
  }
}
