# Module 09: Chuyển Giọng đọc Tự động (Giọng nói TTS — S8)

> **Trạng thái:** ⏳ **CHỜ THỰC HIỆN**  
> **Công đoạn Pipeline:** S8 (Text-To-Speech & Đo thời lượng Timestamp)  
> **Phạm vi:** Dịch vụ TTS + Trình kiểm tra phát âm

---

## 1. Mục tiêu

Tự động chuyển đổi văn bản kịch bản từ Gate B thành các file âm thanh giọng đọc tiếng Việt truyền cảm, phân vai giọng đọc cho các nhân vật và đo chính xác mốc thời gian bắt đầu/kết thúc (timestamp) để khớp hình.

---

## 2. Phạm vi chi tiết

1. **Tích hợp các Engine TTS**:
   - Dịch vụ miễn phí/tốc độ cao: Edge TTS (Microsoft Natural Voices: Hoài My, Nam Minh...).
   - Dịch vụ cao cấp: ElevenLabs, Vbee, OpenAI Audio.
   - Hỗ trợ tuỳ chỉnh tốc độ đọc (`speed`), cao độ (`pitch`) và âm lượng (`volume`).
2. **Phân vai giọng đọc (Voice Assignment)**:
   - Giọng dẫn truyện (Narrator): Giọng trầm ấm, truyền cảm.
   - Giọng nhân vật nam, nữ, phản diện: Tự động gán theo cấu hình nhân vật đã chốt ở Module 07.
3. **Đo Timestamp & Căn chỉnh câu**:
   - Trả về thời lượng phát chính xác (duration) của từng câu đọc dạng mili-giây.
   - Sử dụng model Speech-To-Text (Whisper) để kiểm tra phát âm đúng chính tả không bị nuốt chữ.
4. **Giao diện Web**:
   - Bấm nghe thử giọng từng câu ngay trên kịch bản.
   - Đổi giọng đọc hoặc gõ lại từ phiên âm nếu phát âm bị sai dấu.
   - Tải file âm thanh `.wav`/`.mp3` hoàn chỉnh của chapter.

---

## 3. Danh sách công việc (Tasks)

- [ ] Adapter tích hợp Edge TTS và ElevenLabs.
- [ ] Bảng CSDL `voice_tracks`: Lưu file audio, start_time, end_time, liên kết `script_segment_id`.
- [ ] Tích hợp Whisper kiểm tra chất lượng âm thanh.
- [ ] Giao diện Web: Player nghe thử giọng và chọn cấu hình voice.
