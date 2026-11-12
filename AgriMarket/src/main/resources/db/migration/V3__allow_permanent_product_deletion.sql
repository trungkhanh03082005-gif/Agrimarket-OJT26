ALTER TABLE order_item
    ALTER COLUMN product_id DROP NOT NULL;

DO $$
DECLARE
    product_fk RECORD;
    delete_action TEXT;
BEGIN
    FOR product_fk IN
        SELECT
            constraint_row.conname,
            child_namespace.nspname AS child_schema,
            child_table.relname AS child_table,
            product_namespace.nspname AS product_schema,
            product_table.relname AS product_table,
            string_agg(format('%I', child_column.attname), ', ' ORDER BY child_key.ordinality) AS child_columns,
            string_agg(format('%I', product_column.attname), ', ' ORDER BY product_key.ordinality) AS product_columns
        FROM pg_constraint constraint_row
        JOIN pg_class child_table
            ON child_table.oid = constraint_row.conrelid
        JOIN pg_namespace child_namespace
            ON child_namespace.oid = child_table.relnamespace
        JOIN pg_class product_table
            ON product_table.oid = constraint_row.confrelid
        JOIN pg_namespace product_namespace
            ON product_namespace.oid = product_table.relnamespace
        CROSS JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS child_key(attnum, ordinality)
        JOIN pg_attribute child_column
            ON child_column.attrelid = child_table.oid
            AND child_column.attnum = child_key.attnum
        CROSS JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY AS product_key(attnum, ordinality)
        JOIN pg_attribute product_column
            ON product_column.attrelid = constraint_row.confrelid
            AND product_column.attnum = product_key.attnum
            AND product_key.ordinality = child_key.ordinality
        WHERE constraint_row.contype = 'f'
            AND constraint_row.confrelid = 'product'::regclass
        GROUP BY
            constraint_row.conname,
            child_namespace.nspname,
            child_table.relname,
            product_namespace.nspname,
            product_table.relname
    LOOP
        delete_action := CASE
            WHEN product_fk.child_table = 'order_item' THEN 'SET NULL'
            ELSE 'CASCADE'
        END;

        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            product_fk.child_schema,
            product_fk.child_table,
            product_fk.conname
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I (%s) ON DELETE %s',
            product_fk.child_schema,
            product_fk.child_table,
            product_fk.conname,
            product_fk.child_columns,
            product_fk.product_schema,
            product_fk.product_table,
            product_fk.product_columns,
            delete_action
        );
    END LOOP;
END $$;
