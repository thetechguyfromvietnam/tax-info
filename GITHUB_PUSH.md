# Hướng dẫn Push lên GitHub

## Có 1 commit mới cần push:
- `473f5c7` - Fix Vercel: Move serverless function to api/ directory

## Cách 1: Sử dụng Personal Access Token (Khuyến nghị)

### Bước 1: Tạo Personal Access Token
1. Vào GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Đặt tên token (ví dụ: "tax-info-app")
4. Chọn scopes: **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy token ngay** (chỉ hiển thị 1 lần!)

### Bước 2: Push với token
```bash
cd "/Users/anhmai/Desktop/F&B Doanh Nghiệp/tax-info-app"
git push origin main
```

Khi được hỏi:
- **Username:** thetechguyfromvietnam
- **Password:** Paste Personal Access Token (KHÔNG phải mật khẩu GitHub)

## Cách 2: Setup SSH Key

### Bước 1: Kiểm tra SSH key
```bash
cat ~/.ssh/id_ed25519.pub
# hoặc
cat ~/.ssh/id_rsa.pub
```

### Bước 2: Thêm SSH key vào GitHub
1. Copy toàn bộ output từ bước 1
2. Vào GitHub.com → Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste key và save

### Bước 3: Test SSH connection
```bash
ssh -T git@github.com
```

Nếu thấy "Hi username! You've successfully authenticated..." thì thành công.

### Bước 4: Đổi lại remote về SSH
```bash
git remote set-url origin git@github.com:thetechguyfromvietnam/tax-info.git
git push origin main
```

## Cách 3: Sử dụng GitHub CLI

```bash
# Install GitHub CLI (nếu chưa có)
brew install gh

# Login
gh auth login

# Push
git push origin main
```

## Lưu ý

- Repository URL: https://github.com/thetechguyfromvietnam/tax-info.git
- Branch: main
- Remote đã được set về HTTPS

