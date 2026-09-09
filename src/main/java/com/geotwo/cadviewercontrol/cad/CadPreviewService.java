package com.geotwo.cadviewercontrol.cad;

import com.aspose.cad.Image;
import com.aspose.cad.License;
import com.aspose.cad.fileformats.cad.CadDrawTypeMode;
import com.aspose.cad.fileformats.cad.CadImage;
import com.aspose.cad.imageoptions.CadRasterizationOptions;
import com.aspose.cad.imageoptions.SvgOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.Locale;

@Service
@Slf4j
public class CadPreviewService {

    public CadPreviewResponse convertToSvg(MultipartFile file) throws Exception {
        String originalFileName = file.getOriginalFilename() == null ? "preview.dwg" : file.getOriginalFilename();
        String fileExt = getFileExt(originalFileName);
        if (!"DWG".equals(fileExt) && !"DXF".equals(fileExt)) {
            throw new IllegalArgumentException("DWG 또는 DXF 파일만 미리보기 할 수 있습니다.");
        }

        Path tempFile = Files.createTempFile("cad-preview-", "." + fileExt.toLowerCase(Locale.ROOT));
        try {
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }
            applyLicenseIfPresent();

            try (CadImage cadImage = (CadImage) Image.load(tempFile.toString());
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                CadRasterizationOptions raster = new CadRasterizationOptions();
                raster.setZoom(1.0f);
                raster.setDrawType(CadDrawTypeMode.UseObjectColor);

                SvgOptions options = new SvgOptions();
                options.setVectorRasterizationOptions(raster);

                cadImage.save(output, options);
                output.flush();

                String base64Svg = Base64.getEncoder().encodeToString(output.toByteArray());
                double width = cadImage.getBounds().getWidth();
                double height = cadImage.getBounds().getHeight();
                return new CadPreviewResponse(base64Svg, width, height, originalFileName, fileExt);
            }
        } finally {
            deleteQuietly(tempFile);
        }
    }

    private void applyLicenseIfPresent() {
        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream("aspose-cad/Aspose.CAD.Java.lic")) {
            if (inputStream != null) {
                License license = new License();
                license.setLicense(inputStream);
            }
        } catch (Exception ignored) {
            // 라이선스가 없거나 읽을 수 없어도 평가판 상태로 변환은 시도한다.
        }
    }

    private String getFileExt(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).toUpperCase(Locale.ROOT);
    }

    private void deleteQuietly(Path tempFile) {
        for (int retry = 0; retry < 3; retry++) {
            try {
                Files.deleteIfExists(tempFile);
                return;
            } catch (IOException e) {
                if (retry == 2) {
                    log.warn("임시 CAD 파일 삭제에 실패했습니다. path={}", tempFile, e);
                    return;
                }
                try {
                    Thread.sleep(200L);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }
}
