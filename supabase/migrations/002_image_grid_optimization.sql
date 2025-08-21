-- Migration for ActualImageGrid optimization
-- Adds indexes and columns for fast image grid rendering

-- 1. Create database indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_generation_id ON images(generation_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_generation_source ON images(generation_source);
CREATE INDEX IF NOT EXISTS idx_images_style_type ON images(style_type);
CREATE INDEX IF NOT EXISTS idx_images_tags_gin ON images USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_imggen_status ON image_generations(status);

-- 2. Add new columns for optimization (nullable, backfill later)
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS thumb_url TEXT,
ADD COLUMN IF NOT EXISTS blurhash TEXT,
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS bytes INTEGER;

-- 3. Create RPC function for optimized group fetching
DROP FUNCTION IF EXISTS get_generation_groups_v1(text,text,text,text[],text,text,integer,integer);

CREATE OR REPLACE FUNCTION get_generation_groups_v1(
    p_search_term TEXT DEFAULT NULL,
    p_source_filter TEXT DEFAULT NULL,
    p_status_filter TEXT DEFAULT NULL,
    p_tags_filter TEXT[] DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_dir TEXT DEFAULT 'desc',
    p_limit_count INTEGER DEFAULT 20,
    p_offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    generation_id UUID,
    trigger TEXT,
    source TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    all_tags TEXT[],
    images JSONB,
    total_group_count BIGINT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count BIGINT;
    v_sort_column TEXT;
    v_sort_direction TEXT;
BEGIN
    -- Validate sort parameters
    v_sort_column := CASE
        WHEN p_sort_by = 'source' THEN 'generation_source'
        WHEN p_sort_by = 'status' THEN 'ig.status'
        ELSE 'COALESCE(ig.completed_at, ig.started_at, now())'
    END;
    
    v_sort_direction := CASE
        WHEN p_sort_dir = 'asc' THEN 'ASC'
        ELSE 'DESC'
    END;

    -- First get the total count with same filters
    WITH filtered_generations AS (
        SELECT DISTINCT ig.id
        FROM image_generations ig
        INNER JOIN images i ON ig.id = i.generation_id
        WHERE (p_search_term IS NULL OR 
               ig.trigger ILIKE '%' || p_search_term || '%' OR
               i.title ILIKE '%' || p_search_term || '%' OR
               i.description ILIKE '%' || p_search_term || '%' OR
               i.prompt_used ILIKE '%' || p_search_term || '%')
          AND (p_source_filter IS NULL OR i.generation_source = p_source_filter)
          AND (p_status_filter IS NULL OR ig.status = p_status_filter)
          AND (p_tags_filter IS NULL OR (
            SELECT bool_or(tag_elem = ANY(p_tags_filter))
            FROM jsonb_array_elements_text(COALESCE(i.tags, '[]'::jsonb)) AS tag_elem
          ))
    )
    SELECT COUNT(*) INTO v_total_count FROM filtered_generations;

    -- Return the paginated results with images
    RETURN QUERY
    WITH filtered_generations AS (
        SELECT ig.id, ig.trigger::TEXT, ig.status::TEXT as generation_status, COALESCE(ig.completed_at, ig.started_at, now()) as generation_created_at,
               i.generation_source::TEXT,
               array_agg(DISTINCT tag_value) FILTER (WHERE tag_value IS NOT NULL) as aggregated_tags
        FROM image_generations ig
        INNER JOIN images i ON ig.id = i.generation_id
        LEFT JOIN jsonb_array_elements_text(i.tags) AS tag_value ON true
        WHERE (p_search_term IS NULL OR 
               ig.trigger ILIKE '%' || p_search_term || '%' OR
               i.title ILIKE '%' || p_search_term || '%' OR
               i.description ILIKE '%' || p_search_term || '%' OR
               i.prompt_used ILIKE '%' || p_search_term || '%')
          AND (p_source_filter IS NULL OR i.generation_source = p_source_filter)
          AND (p_status_filter IS NULL OR ig.status = p_status_filter)
          AND (p_tags_filter IS NULL OR (
            SELECT bool_or(tag_elem = ANY(p_tags_filter))
            FROM jsonb_array_elements_text(COALESCE(i.tags, '[]'::jsonb)) AS tag_elem
          ))
        GROUP BY ig.id, ig.trigger, ig.status, ig.completed_at, ig.started_at, i.generation_source
    ),
    ordered_generations AS (
        SELECT *,
               ROW_NUMBER() OVER (
                   ORDER BY 
                   CASE WHEN p_sort_by = 'source' AND p_sort_dir = 'asc' THEN generation_source END ASC,
                   CASE WHEN p_sort_by = 'source' AND p_sort_dir = 'desc' THEN generation_source END DESC,
                   CASE WHEN p_sort_by = 'status' AND p_sort_dir = 'asc' THEN generation_status END ASC,
                   CASE WHEN p_sort_by = 'status' AND p_sort_dir = 'desc' THEN generation_status END DESC,
                   CASE WHEN p_sort_dir = 'asc' THEN generation_created_at END ASC,
                   CASE WHEN p_sort_dir = 'desc' THEN generation_created_at END DESC
               ) as row_num
        FROM filtered_generations
    ),
    paged_generations AS (
        SELECT * FROM ordered_generations
        WHERE row_num > p_offset_count 
        AND row_num <= p_offset_count + p_limit_count
    )
    SELECT 
        pg.id::UUID as generation_id,
        pg.trigger,
        pg.generation_source as source,
        pg.generation_status as status,
        pg.generation_created_at as created_at,
        COALESCE(pg.aggregated_tags, ARRAY[]::TEXT[]) as all_tags,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'storage_url', i.storage_url,
                    'thumb_url', i.thumb_url,
                    'blurhash', i.blurhash,
                    'title', i.title,
                    'description', i.description,
                    'style_type', i.style_type,
                    'model_name', i.model_name,
                    'tags', i.tags,
                    'created_at', i.created_at,
                    'generation_status', pg.generation_status,
                    'prompt_used', i.prompt_used,
                    'width', i.width,
                    'height', i.height
                ) ORDER BY 
                    CASE WHEN i.style_type IS NOT NULL THEN 0 ELSE 1 END,
                    i.style_type,
                    i.created_at
            )
            FROM images i 
            WHERE i.generation_id = pg.id 
            LIMIT 6
        ) as images,
        v_total_count as total_group_count
    FROM paged_generations pg
    ORDER BY pg.row_num;
END;
$$;
