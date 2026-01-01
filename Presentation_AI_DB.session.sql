SELECT id,
    presentation_id,
    page_number,
    left(content_text, 50) as metin_basi,
    CASE
        WHEN embedding IS NOT NULL THEN 'VAR ✅'
        ELSE 'YOK ❌'
    END as vektor_durumu
FROM slides;