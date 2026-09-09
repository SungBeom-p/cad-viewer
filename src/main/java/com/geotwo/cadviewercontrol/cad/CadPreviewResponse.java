package com.geotwo.cadviewercontrol.cad;

public class CadPreviewResponse {
    private final String base;
    private final double realWidth;
    private final double realHeight;
    private final String fileName;
    private final String fileExt;

    public CadPreviewResponse(String base, double realWidth, double realHeight, String fileName, String fileExt) {
        this.base = base;
        this.realWidth = realWidth;
        this.realHeight = realHeight;
        this.fileName = fileName;
        this.fileExt = fileExt;
    }

    public String getBase() {
        return base;
    }

    public double getRealWidth() {
        return realWidth;
    }

    public double getRealHeight() {
        return realHeight;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFileExt() {
        return fileExt;
    }
}