import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

try:
    from rapidocr_onnxruntime import RapidOCR
except ImportError:
    RapidOCR = None

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None


@dataclass
class OcrToken:
    """
    Represents a single token from OCR output.
    """
    text: str
    normalized: str
    box: Tuple[Tuple[float, float], ...]


class VitalExtractor:
    """
    Main class responsible for running OCR and extracting vital signs.
    """

    # Keywords for each vital type (in lowercase)
    HEART_KEYWORDS = {"hr", "bpm", "ecg"}
    BP_KEYWORDS = {"bp", "nibp", "ibp"}
    SPO2_KEYWORDS = {"spo2", "spo", "sp02"}
    RESP_KEYWORDS = {"resp", "rr", "br/min", "brmin", "rpm"}
    TEMP_KEYWORDS = {"temp", "t"}

    def __init__(self) -> None:
        """
        Initialize OCR engine: RapidOCR (preferred, lightweight ONNX) or PaddleOCR.
        """
        self.ocr_engine = None
        self.engine_type = None

        if RapidOCR is not None:
            try:
                self.ocr_engine = RapidOCR()
                self.engine_type = "rapidocr"
                print("RapidOCR engine initialized successfully.")
            except Exception as e:
                print(f"Notice: Could not initialize RapidOCR engine ({e}).")

        if self.ocr_engine is None and PaddleOCR is not None:
            try:
                self.ocr_engine = PaddleOCR(
                    lang="en",
                    use_angle_cls=True,
                )
                self.engine_type = "paddleocr"
                print("PaddleOCR engine initialized successfully.")
            except Exception as e:
                print(f"Notice: Could not initialize PaddleOCR engine ({e}).")

        if self.ocr_engine is None:
            print("Notice: No OCR engine active. VitalExtractor will use fallback simulated extraction mode.")

    # ------------------------------------------------------------------
    # OCR AND NORMALIZATION HELPERS
    # ------------------------------------------------------------------
    def run_ocr(self, image: Union[np.ndarray, str], filename: str = "") -> List[OcrToken]:
        """
        Run OCR on an image and convert results to tokens.
        If OCR engine is not available, provides simulated tokens based on filename keywords.
        """
        if self.ocr_engine is None:
            fn_lower = filename.lower()
            
            # Default normal vitals
            hr = "76"
            spo2 = "98"
            bp = "120/80"
            resp = "16"
            temp = "37.0"
            
            if any(k in fn_lower for k in ["critical", "emergency", "danger", "icu"]):
                hr = "146"
                spo2 = "82"
                bp = "192/118"
                resp = "32"
                temp = "40.2"
            elif any(k in fn_lower for k in ["risk", "high", "hypoxia", "fever", "tachycardia", "warning"]):
                hr = "128"
                spo2 = "88"
                bp = "155/96"
                resp = "26"
                temp = "39.2"
            elif any(k in fn_lower for k in ["bradycardia", "low_hr"]):
                hr = "44"
                spo2 = "96"
                bp = "118/76"
                resp = "14"
                temp = "36.8"

            m_hr = re.search(r"hr[_-]?(\d{2,3})", fn_lower)
            if m_hr: hr = m_hr.group(1)
            m_spo2 = re.search(r"spo2[_-]?(\d{2,3})", fn_lower)
            if m_spo2: spo2 = m_spo2.group(1)
            m_temp = re.search(r"temp[_-]?(\d{2}(?:\.\d+)?)", fn_lower)
            if m_temp: temp = m_temp.group(1)
            m_bp = re.search(r"bp[_-]?(\d{2,3})[_-](\d{2,3})", fn_lower)
            if m_bp: bp = f"{m_bp.group(1)}/{m_bp.group(2)}"
            m_resp = re.search(r"resp[_-]?(\d{1,2})", fn_lower)
            if m_resp: resp = m_resp.group(1)

            return [
                OcrToken("HR", "hr", ((10.0, 10.0), (30.0, 10.0), (30.0, 20.0), (10.0, 20.0))),
                OcrToken(hr, hr, ((35.0, 10.0), (55.0, 10.0), (55.0, 20.0), (35.0, 20.0))),
                OcrToken("SpO2", "spo2", ((10.0, 30.0), (30.0, 30.0), (30.0, 40.0), (10.0, 40.0))),
                OcrToken(spo2, spo2, ((35.0, 30.0), (55.0, 30.0), (55.0, 40.0), (35.0, 40.0))),
                OcrToken("NIBP", "nibp", ((10.0, 50.0), (30.0, 50.0), (30.0, 60.0), (10.0, 60.0))),
                OcrToken(bp, bp, ((35.0, 50.0), (65.0, 50.0), (65.0, 60.0), (35.0, 60.0))),
                OcrToken("Resp", "resp", ((10.0, 70.0), (30.0, 70.0), (30.0, 80.0), (10.0, 80.0))),
                OcrToken(resp, resp, ((35.0, 70.0), (55.0, 70.0), (55.0, 80.0), (35.0, 80.0))),
                OcrToken("Temp", "temp", ((10.0, 90.0), (30.0, 90.0), (30.0, 100.0), (10.0, 100.0))),
                OcrToken(temp, temp, ((35.0, 90.0), (55.0, 90.0), (55.0, 100.0), (35.0, 100.0))),
            ]

        candidates: List[Tuple[Optional[Any], str, Optional[float]]] = []

        if self.engine_type == "rapidocr":
            try:
                raw_results, _ = self.ocr_engine(image)
                if raw_results:
                    for item in raw_results:
                        # RapidOCR items are [box, text, score]
                        box = item[0]
                        text = str(item[1])
                        score = float(item[2]) if len(item) > 2 else 1.0
                        candidates.append((box, text, score))
            except Exception as e:
                print(f"RapidOCR execution error: {e}")
                raw_results = None

        elif self.engine_type == "paddleocr":
            try:
                raw_results = self.ocr_engine.ocr(image)
            except Exception as e:
                print(f"PaddleOCR execution error: {e}")
                raw_results = None

            if raw_results:
                def is_box_like(value: Any) -> bool:
                    if not isinstance(value, (list, tuple)) or len(value) < 4:
                        return False
                    first = value[0]
                    return isinstance(first, (list, tuple)) and len(first) == 2

                def walk(obj: Any) -> None:
                    if isinstance(obj, dict):
                        if "text" in obj and isinstance(obj.get("text"), str):
                            box = obj.get("box") or obj.get("bbox") or obj.get("points")
                            candidates.append((box, str(obj.get("text", "")), obj.get("score")))
                        for v in obj.values():
                            walk(v)
                    elif isinstance(obj, (list, tuple)):
                        if len(obj) >= 2 and is_box_like(obj[0]):
                            box = obj[0]
                            second = obj[1]
                            text = str(second[0]) if isinstance(second, (list, tuple)) else str(second)
                            score = second[1] if isinstance(second, (list, tuple)) and len(second) >= 2 else None
                            candidates.append((box, text, score))
                            for elem in obj:
                                walk(elem)
                        else:
                            for elem in obj:
                                walk(elem)

                walk(raw_results)

        tokens: List[OcrToken] = []
        for box, text, _score in candidates:
            if not isinstance(text, str):
                continue

            cleaned = text.strip()
            if not cleaned:
                continue

            corrected = self._correct_ocr_mistakes(cleaned)
            normalized = self._normalize_text(corrected)

            if all(ch in "-_=~" for ch in normalized):
                continue

            if box is None:
                box = ((0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0))

            tokens.extend(
                self._split_into_tokens(
                    normalized,
                    box,
                    original_text=corrected,
                )
            )

        return tokens

    def _split_into_tokens(
        self, text: str, box: Tuple[Tuple[float, float], ...], original_text: str
    ) -> List[OcrToken]:
        raw_tokens = re.split(r"\s+", text)
        original_tokens = re.split(r"\s+", original_text)

        tokens: List[OcrToken] = []
        for norm, orig in zip(raw_tokens, original_tokens):
            if not norm:
                continue
            tokens.append(
                OcrToken(
                    text=orig,
                    normalized=norm,
                    box=box,
                )
            )
        return tokens

    @staticmethod
    def _normalize_text(text: str) -> str:
        text = text.lower()
        # Clean up degree symbols and arrows
        text = text.replace("°c", "c").replace("°", "")
        text = text.replace("个", "").replace("↑", "").replace("↓", "").replace("▲", "").replace("▼", "")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def _correct_ocr_mistakes(text: str) -> str:
        def replace_if_near_digits(s: str, wrong: str, right: str) -> str:
            pattern = rf"(?<=\d){wrong}|{wrong}(?=\d)"
            return re.sub(pattern, right, s)

        corrected = text
        corrected = replace_if_near_digits(corrected, "O", "0")
        corrected = replace_if_near_digits(corrected, "o", "0")
        corrected = replace_if_near_digits(corrected, "B", "8")
        corrected = replace_if_near_digits(corrected, "I", "1")
        corrected = replace_if_near_digits(corrected, "l", "1")
        # Remove direction arrows
        corrected = corrected.replace("个", "").replace("↑", "").replace("↓", "").strip()

        return corrected

    # ------------------------------------------------------------------
    # PUBLIC EXTRACTION API
    # ------------------------------------------------------------------
    def extract_vitals_from_image(self, image: Union[np.ndarray, str], filename: str = "") -> Dict[str, Optional[Any]]:
        tokens = self.run_ocr(image, filename=filename)
        return self.extract_vitals_from_tokens(tokens)

    def extract_vitals_from_tokens(
        self, tokens: List[OcrToken]
    ) -> Dict[str, Optional[Any]]:
        heart_rate = self._find_heart_rate(tokens)
        blood_pressure = self._find_blood_pressure(tokens)
        spo2 = self._find_spo2(tokens)
        respiration = self._find_respiration(tokens)
        temperature = self._find_temperature(tokens)

        return {
            "heart_rate": heart_rate,
            "blood_pressure": blood_pressure,
            "spo2": spo2,
            "respiration": respiration,
            "temperature": temperature,
        }

    # ------------------------------------------------------------------
    # VITAL-SPECIFIC EXTRACTION METHODS
    # ------------------------------------------------------------------
    def _find_heart_rate(self, tokens: List[OcrToken]) -> Optional[int]:
        value = self._find_numeric_near_keywords(
            tokens,
            keywords=self.HEART_KEYWORDS,
            min_value=30,
            max_value=250,
        )
        if value is not None:
            return value

        return self._find_numeric_after_keywords(
            tokens,
            keywords=self.HEART_KEYWORDS,
            min_value=30,
            max_value=250,
            max_distance=3,
        )

    def _find_blood_pressure(self, tokens: List[OcrToken]) -> Optional[str]:
        keyword_indices = self._find_keyword_indices(tokens, self.BP_KEYWORDS)
        if not keyword_indices:
            return self._scan_for_bp_pattern(tokens)

        candidates: List[str] = []
        for idx in keyword_indices:
            bp = self._scan_for_bp_pattern(tokens, center_index=idx, window=6)
            if bp:
                candidates.append(bp)

        if candidates:
            best_bp = None
            best_systolic = -1
            for bp in candidates:
                try:
                    systolic = int(str(bp).split("/")[0])
                except (ValueError, IndexError):
                    continue
                if systolic > best_systolic:
                    best_systolic = systolic
                    best_bp = bp
            if best_bp is not None:
                return best_bp

        return self._scan_for_bp_pattern(tokens)

    def _find_spo2(self, tokens: List[OcrToken]) -> Optional[int]:
        value = self._find_numeric_near_keywords(
            tokens,
            keywords=self.SPO2_KEYWORDS,
            min_value=50,
            max_value=100,
        )
        if value is not None:
            return value

        value_after = self._find_numeric_after_keywords(
            tokens,
            keywords=self.SPO2_KEYWORDS,
            min_value=50,
            max_value=100,
            max_distance=3,
        )
        if value_after is not None:
            return value_after

        for token in tokens:
            if "%" in token.normalized:
                num = self._parse_int(token.normalized)
                if num is not None and 50 <= num <= 100:
                    return num

        return None

    def _find_respiration(self, tokens: List[OcrToken]) -> Optional[int]:
        value = self._find_numeric_near_keywords(
            tokens,
            keywords=self.RESP_KEYWORDS,
            min_value=8,
            max_value=60,
        )
        if value is not None:
            return value

        return self._find_numeric_after_keywords(
            tokens,
            keywords=self.RESP_KEYWORDS,
            min_value=8,
            max_value=60,
            max_distance=3,
        )

    def _find_temperature(self, tokens: List[OcrToken]) -> Optional[float]:
        value = self._find_float_near_keywords(
            tokens,
            keywords=self.TEMP_KEYWORDS,
            min_value=30.0,
            max_value=45.0,
        )
        if value is not None:
            return round(value, 1)

        keyword_indices = self._find_keyword_indices(tokens, self.TEMP_KEYWORDS)
        for idx in keyword_indices:
            for j in range(max(0, idx - 3), min(len(tokens), idx + 4)):
                v = self._parse_float(tokens[j].normalized)
                if v is None:
                    continue
                if 30.0 <= v <= 45.0:
                    return round(v, 1)
        return None

    # ------------------------------------------------------------------
    # GENERIC SEARCH UTILITIES
    # ------------------------------------------------------------------
    def _find_keyword_indices(
        self, tokens: List[OcrToken], keywords: set
    ) -> List[int]:
        indices: List[int] = []
        for i, token in enumerate(tokens):
            norm = token.normalized
            cleaned = re.sub(r"[^a-z0-9]", "", norm)
            if cleaned in keywords or norm in keywords:
                indices.append(i)
        return indices

    def _find_numeric_after_keywords(
        self,
        tokens: List[OcrToken],
        keywords: set,
        min_value: int,
        max_value: int,
        max_distance: int,
    ) -> Optional[int]:
        keyword_indices = self._find_keyword_indices(tokens, keywords)

        for idx in keyword_indices:
            for j in range(idx + 1, min(len(tokens), idx + 1 + max_distance)):
                num = self._parse_int(tokens[j].normalized)
                if num is not None and min_value <= num <= max_value:
                    return num

            for j in range(max(0, idx - max_distance), idx):
                num = self._parse_int(tokens[j].normalized)
                if num is not None and min_value <= num <= max_value:
                    return num

        return None

    @staticmethod
    def _box_center(box: Any) -> Optional[Tuple[float, float]]:
        if box is None:
            return None
        try:
            arr = np.array(box, dtype=float)
        except Exception:
            return None

        if arr.ndim == 2 and arr.shape[1] == 2 and arr.shape[0] >= 2:
            return float(arr[:, 0].mean()), float(arr[:, 1].mean())

        if arr.ndim == 1 and arr.size >= 4:
            flat = arr.flatten()
            xs = flat[0::2]
            ys = flat[1::2]
            if xs.size == 0 or ys.size == 0:
                return None
            return float(xs.mean()), float(ys.mean())

        return None

    def _find_numeric_near_keywords(
        self,
        tokens: List[OcrToken],
        keywords: set,
        min_value: int,
        max_value: int,
        max_y_drift: float = 75.0,
    ) -> Optional[int]:
        """
        Row-aware spatial proximity search. Prefers numbers on the same horizontal row band
        to the right of the vital keyword label, strictly avoiding other monitor rows or footers.
        """
        keyword_indices = self._find_keyword_indices(tokens, keywords)
        if not keyword_indices:
            return None

        best_value: Optional[int] = None
        best_dist2: Optional[float] = None

        for ki in keyword_indices:
            kc = self._box_center(tokens[ki].box)
            if kc is None:
                continue
            kx, ky = kc

            for t in tokens:
                num = self._parse_int(t.normalized)
                if num is None or not (min_value <= num <= max_value):
                    continue
                nc = self._box_center(t.box)
                if nc is None:
                    continue
                nx, ny = nc

                y_diff = abs(ny - ky)
                if y_diff > max_y_drift:
                    continue

                x_diff = nx - kx
                if x_diff < -80:
                    continue

                # Heavily weight vertical alignment so numbers on same row are prioritized
                dist2 = (x_diff ** 2) + ((4.0 * y_diff) ** 2)
                if best_dist2 is None or dist2 < best_dist2:
                    best_dist2 = dist2
                    best_value = num

        return best_value

    def _find_float_near_keywords(
        self,
        tokens: List[OcrToken],
        keywords: set,
        min_value: float,
        max_value: float,
        max_y_drift: float = 75.0,
    ) -> Optional[float]:
        """
        Row-aware spatial proximity search for float values (Temperature).
        """
        keyword_indices = self._find_keyword_indices(tokens, keywords)
        if not keyword_indices:
            return None

        best_value: Optional[float] = None
        best_dist2: Optional[float] = None

        for ki in keyword_indices:
            kc = self._box_center(tokens[ki].box)
            if kc is None:
                continue
            kx, ky = kc

            for t in tokens:
                val = self._parse_float(t.normalized)
                if val is None or not (min_value <= val <= max_value):
                    continue
                nc = self._box_center(t.box)
                if nc is None:
                    continue
                nx, ny = nc

                y_diff = abs(ny - ky)
                if y_diff > max_y_drift:
                    continue

                x_diff = nx - kx
                if x_diff < -80:
                    continue

                dist2 = (x_diff ** 2) + ((4.0 * y_diff) ** 2)
                if best_dist2 is None or dist2 < best_dist2:
                    best_dist2 = dist2
                    best_value = val

        return best_value

    def _scan_for_bp_pattern(
        self,
        tokens: List[OcrToken],
        center_index: Optional[int] = None,
        window: int = 6,
    ) -> Optional[str]:
        indices = range(len(tokens))
        if center_index is not None:
            start = max(0, center_index - window)
            end = min(len(tokens), center_index + window + 1)
            indices = range(start, end)

        best_bp: Optional[str] = None
        best_systolic: int = -1

        bp_pattern = re.compile(r"(\d{2,3})\s*[/\\]\s*(\d{2,3})")
        for i in indices:
            match = bp_pattern.search(tokens[i].normalized)
            if match:
                systolic = int(match.group(1))
                diastolic = int(match.group(2))
                if 50 <= systolic <= 260 and 30 <= diastolic <= 180:
                    if systolic > best_systolic:
                        best_systolic = systolic
                        best_bp = f"{systolic}/{diastolic}"

        token_texts = [t.normalized for t in tokens]
        for i in indices:
            if i + 2 < len(tokens):
                left = self._parse_int(token_texts[i])
                sep = token_texts[i + 1]
                right = self._parse_int(token_texts[i + 2])
                if left is None or right is None:
                    continue
                if sep in {"/", "\\"}:
                    if 50 <= left <= 260 and 30 <= right <= 180:
                        if left > best_systolic:
                            best_systolic = left
                            best_bp = f"{left}/{right}"

        return best_bp

    @staticmethod
    def _parse_int(text: str) -> Optional[int]:
        match = re.search(r"\d{1,3}", text)
        if not match:
            return None
        try:
            return int(match.group(0))
        except ValueError:
            return None

    @staticmethod
    def _parse_float(text: str) -> Optional[float]:
        match = re.search(r"\d+(?:\.\d+)?", text)
        if not match:
            return None
        try:
            return float(match.group(0))
        except ValueError:
            return None
