package com.geotwo.cadviewercontrol.cad;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/cad")
public class CadPreviewController {

    private final CadPreviewService cadPreviewService;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ApiResponse<CadPreviewResponse> preview(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ApiResponse.fail("미리보기 할 파일을 선택해주세요.");
            }
            return ApiResponse.ok(cadPreviewService.convertToSvg(file));
        } catch (IllegalArgumentException e) {
            return ApiResponse.fail(e.getMessage());
        } catch (Exception e) {
            log.error("CAD 파일 변환에 실패했습니다. fileName={}, size={}", file.getOriginalFilename(), file.getSize(), e);
            return ApiResponse.fail("CAD 파일 변환에 실패했습니다: " + e.getMessage());
        } catch (Throwable e) {
            log.error("CAD 파일 변환 중 실행 환경 오류가 발생했습니다. fileName={}, size={}", file.getOriginalFilename(), file.getSize(), e);
            return ApiResponse.fail("CAD 파일 변환 중 실행 환경 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
