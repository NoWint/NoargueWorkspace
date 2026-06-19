 -- 为待办表和共享待办表增加优先级字段
 -- 四象限：p1 紧急重要 / p2 重要不紧急(默认) / p3 紧急不重要 / p4 不紧急不重要
 
 ALTER TABLE todos ADD COLUMN priority VARCHAR(8) DEFAULT 'p2' AFTER images;
 ALTER TABLE shared_todos ADD COLUMN priority VARCHAR(8) DEFAULT 'p2' AFTER images;
