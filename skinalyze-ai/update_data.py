"""
Script cập nhật data: Chuyển CSV mới sang product_chunks.txt
Chạy: python update_data.py
"""

import pandas as pd
from pathlib import Path
import shutil

PATH = Path(__file__).parent.resolve()
# Đường dẫn
CSV_FILE = PATH / "data" / "fixed_cosmetic.csv"
CHUNKS_FILE = PATH / "data" / "product_chunks.txt"
DB_DIR = PATH / "db_chroma"

def get_skin_types(row):
    """Chuyển đổi cột binary sang tên loại da"""
    skin_types = []
    if row.get('Combination') == 1:
        skin_types.append('Combination')
    if row.get('Dry') == 1:
        skin_types.append('Dry')
    if row.get('Normal') == 1:
        skin_types.append('Normal')
    if row.get('Oily') == 1:
        skin_types.append('Oily')
    if row.get('Sensitive') == 1:
        skin_types.append('Sensitive')
    return ', '.join(skin_types) if skin_types else 'All skin types'

def main():
    print("\n" + "=" * 80)
    print("🔄 CẬP NHẬT DATA MỚI")
    print("=" * 80)
    
    # 1. Kiểm tra CSV
    if not CSV_FILE.exists():
        print(f"❌ Không tìm thấy file CSV: {CSV_FILE}")
        return
    
    # 2. Đọc CSV
    print(f"\n📖 Đang đọc CSV: {CSV_FILE.name}...")
    df = pd.read_csv(CSV_FILE, encoding='utf-8')
    print(f"✅ Đọc thành công {len(df)} sản phẩm")
    print(f"📝 Các cột: {list(df.columns)}\n")
    
    # 3. Tạo chunks với format giống file cũ
    print("🔨 Đang tạo chunks...")
    chunks = []
    
    for idx, row in df.iterrows():
        skin_types = get_skin_types(row)
        
        # Chunk 1: Product Summary
        summary_chunk = f"""Chunk Type: Product Summary
Product Name: {row.get('Name', 'N/A')}
Brand: {row.get('Brand', 'N/A')}
Category: {row.get('Label', 'N/A')}
Suitable for: {skin_types}
Rank: {row.get('Rank', 'N/A')}/5.0
Price: ${row.get('Price', 'N/A')}
---"""
        chunks.append(summary_chunk)
        
        # Chunk 2: Ingredients (nếu dài thì chia thành nhiều chunks)
        ingredients = str(row.get('Ingredients', 'N/A'))
        if len(ingredients) > 500:
            # Chia ingredients thành nhiều phần
            part1 = ingredients[:500] + "..."
            ingredient_chunk1 = f"""Chunk Type: Ingredients
Product Name: {row.get('Name', 'N/A')}
Brand: {row.get('Brand', 'N/A')}
Ingredients excerpt: {part1}
---"""
            chunks.append(ingredient_chunk1)
            
            # Phần còn lại
            part2 = "..." + ingredients[500:]
            ingredient_chunk2 = f"""Chunk Type: Ingredients
Product Name: {row.get('Name', 'N/A')}
Brand: {row.get('Brand', 'N/A')}
Ingredients excerpt: {part2}
---"""
            chunks.append(ingredient_chunk2)
        else:
            ingredient_chunk = f"""Chunk Type: Ingredients
Product Name: {row.get('Name', 'N/A')}
Brand: {row.get('Brand', 'N/A')}
Ingredients: {ingredients}
---"""
            chunks.append(ingredient_chunk)
        
        # Progress
        if (idx + 1) % 100 == 0:
            print(f"   Đã xử lý: {idx + 1}/{len(df)} sản phẩm")
    
    # 4. Backup file cũ (nếu có)
    if CHUNKS_FILE.exists():
        backup_file = CHUNKS_FILE.with_suffix('.txt.backup')
        shutil.copy(CHUNKS_FILE, backup_file)
        print(f"\n💾 Đã backup file cũ → {backup_file.name}")
    
    # 5. Ghi file mới
    print(f"\n💾 Đang ghi {len(chunks)} chunks vào: {CHUNKS_FILE.name}...")
    with open(CHUNKS_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(chunks))
    
    # 6. Xóa database cũ
    if DB_DIR.exists():
        print(f"\n🗑️  Đang xóa database cũ...")
        shutil.rmtree(DB_DIR)
        print("✅ Đã xóa database cũ!")
    
    # 7. Thống kê
    file_size = CHUNKS_FILE.stat().st_size / (1024 * 1024)
    print(f"\n✅ CẬP NHẬT HOÀN TẤT!")
    print(f"📊 Thống kê:")
    print(f"   • Sản phẩm: {len(df)}")
    print(f"   • Chunks: {len(chunks)}")
    print(f"   • Kích thước: {file_size:.2f} MB")
    print(f"\n💡 Bước tiếp theo:")
    print(f"   1. Chạy: python RAG_cosmetic.py")
    print(f"   2. Bot sẽ tự động tạo database mới từ chunks")
    print("=" * 80)

if __name__ == "__main__":
    main()