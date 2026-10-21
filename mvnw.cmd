@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF)
@REM Maven Wrapper script for Windows
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_VERBOSE%" == "" @SET __MVNW_VERBOSE=false

@SET __MVNW_CMD=mvnw
@SET WRAPPER_JAR="%~dp0\.mvn\wrapper\maven-wrapper.jar"
@SET WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"
@SET MAVEN_DIST_URL="https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip"

@REM Check if JAVA_HOME or java is available
@SET JAVA_EXE=java
@IF NOT "%JAVA_HOME%" == "" @SET JAVA_EXE="%JAVA_HOME%\bin\java"

@REM Download maven-wrapper.jar if not present
@IF NOT EXIST %WRAPPER_JAR% (
    @ECHO Downloading Maven Wrapper...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri %WRAPPER_URL% -OutFile %WRAPPER_JAR%}"
)

@REM Download Maven distribution if not present
@SET MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6
@IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
    @ECHO Downloading Apache Maven 3.9.6...
    @IF NOT EXIST "%MAVEN_HOME%" @MKDIR "%MAVEN_HOME%"
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $zip='%MAVEN_HOME%\maven.zip'; Invoke-WebRequest -Uri %MAVEN_DIST_URL% -OutFile $zip; Expand-Archive -Path $zip -DestinationPath '%MAVEN_HOME%' -Force; Remove-Item $zip; $inner=Get-ChildItem '%MAVEN_HOME%' -Directory | Select-Object -First 1; if($inner.Name -ne 'bin'){Get-ChildItem $inner.FullName | Move-Item -Destination '%MAVEN_HOME%'}}"
)

@SET MAVEN_CMD="%MAVEN_HOME%\bin\mvn.cmd"
%MAVEN_CMD% %*
