# Common Rendering Issues and Fixes

This document catalogs common rendering issues that RenderDoc Debug Agent can detect and how to fix them.

## NaN and Infinity Issues

### Division by Zero

**Problem**: Dividing by zero or very small numbers produces NaN or Inf values.

**Symptoms**: Black pixels, flickering, unstable rendering

**Detection**: Look for division operations without checks

**Fix**:
```hlsl
// Bad
float result = numerator / denominator;

// Good
float result = numerator / max(denominator, 0.0001);

// Alternative
float result = abs(denominator) > 0.0001 ? numerator / denominator : 0.0;
```

### Zero-Length Vector Normalization

**Problem**: Normalizing zero or near-zero length vectors produces NaN.

**Symptoms**: Lighting artifacts, normal map issues, incorrect reflections

**Detection**: Check normalize() calls on potentially zero vectors

**Fix**:
```hlsl
// Bad
float3 normal = normalize(input.normal);

// Good - Method 1: Length check
float3 normal = input.normal;
float lenSq = dot(normal, normal);
if (lenSq > 0.0001) {
    normal = normal * rsqrt(lenSq);  // Fast normalize
} else {
    normal = float3(0, 1, 0);  // Default up vector
}

// Good - Method 2: Safe normalize function
float3 safeNormalize(float3 v, float3 fallback) {
    float lenSq = dot(v, v);
    return lenSq > 0.0001 ? v * rsqrt(lenSq) : fallback;
}

float3 normal = safeNormalize(input.normal, float3(0, 1, 0));
```

### Invalid Mathematical Operations

**Problem**: Square root of negative, log of zero/negative, etc.

**Symptoms**: Computation artifacts, shader failures

**Fix**:
```hlsl
// Bad
float result = sqrt(value);
float logVal = log(x);

// Good
float result = sqrt(max(value, 0.0));
float logVal = log(max(x, 0.0001));

// Or use saturate/clamp
float result = sqrt(saturate(value));
```

## Precision Issues

### Depth Fighting (Z-Fighting)

**Problem**: Insufficient depth buffer precision causes flickering between overlapping surfaces.

**Symptoms**: Surface flickering, polygon fighting

**Solutions**:

1. **Reverse-Z Depth**:
```hlsl
// In vertex shader
output.position.z = 1.0 - output.position.z;  // Reverse depth
```

2. **Logarithmic Depth**:
```hlsl
// Vertex shader
float FC = 1.0 / log(farPlane + 1.0);
output.position.z = log(linearDepth + 1.0) * FC;
```

3. **Increase near plane distance**:
```cpp
// CPU side
float nearPlane = 1.0;  // Instead of 0.1
float farPlane = 1000.0;
```

### Float Precision Issues

**Problem**: Using mediump where highp is needed.

**Symptoms**: Jittering, incorrect positions, banding

**Fix**:
```glsl
// Bad (GLSL ES)
mediump vec3 worldPos;

// Good
highp vec3 worldPos;  // For positions
highp float depth;    // For depth values
mediump vec3 color;   // OK for colors
```

## Blending Issues

### Pre-multiplied Alpha

**Problem**: Incorrect blend mode for pre-multiplied alpha.

**Symptoms**: Dark halos, incorrect transparency

**Fix**:
```cpp
// For pre-multiplied alpha textures
glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);

// DirectX
BlendState.SrcBlend = D3D11_BLEND_ONE;
BlendState.DestBlend = D3D11_BLEND_INV_SRC_ALPHA;
```

### Alpha Output

**Problem**: Not outputting correct alpha from pixel shader.

**Fix**:
```hlsl
// Ensure alpha is set
output.color = float4(rgb, alpha);

// For pre-multiplied alpha
output.color = float4(rgb * alpha, alpha);
```

## Shader Compilation Issues

### Uninitialized Variables

**Problem**: Using variables before initialization.

**Fix**:
```hlsl
// Bad
float3 result;
if (condition) {
    result = calculateValue();
}
return result;  // May be uninitialized

// Good
float3 result = float3(0, 0, 0);  // Initialize
if (condition) {
    result = calculateValue();
}
return result;
```

### Type Mismatches

**Problem**: Implicit conversions that may fail.

**Fix**:
```hlsl
// Bad
float3 color = 1.0;  // Scalar to vector

// Good
float3 color = float3(1.0, 1.0, 1.0);

// Bad
int index = 3.7;  // Float to int

// Good
int index = int(3.7);  // Explicit cast
```

## Resource Binding Issues

### Unbound Resources

**Problem**: Shader expects a texture/buffer that isn't bound.

**Symptoms**: Black textures, default values, crashes

**Detection**: Check all shader resource slots are bound

**Fix**:
```cpp
// Ensure all resources are bound
device->PSSetShaderResources(0, 1, &texture);
device->PSSetSamplers(0, 1, &sampler);

// Use default textures for optional resources
if (!optionalTexture) {
    optionalTexture = defaultWhiteTexture;
}
```

## Performance Issues

### Texture Sampling in Vertex Shaders

**Problem**: Vertex texture fetch can be slow on some hardware.

**Solution**: Move to pixel shader or use uniform buffers.

### Excessive Branching

**Problem**: Dynamic branching in shaders reduces performance.

**Fix**:
```hlsl
// Bad - lots of branching
if (condition1) {
    result = a;
} else if (condition2) {
    result = b;
} else {
    result = c;
}

// Better - use lerp/mix
float weight = condition1 ? 1.0 : 0.0;
result = lerp(c, lerp(b, a, condition1), weight);

// Or use step functions
result = a * step(0.5, condition1) + b * step(0.5, condition2) + c;
```

### Redundant Calculations

**Problem**: Calculating same value multiple times.

**Fix**:
```hlsl
// Bad
float3 lighting = ambient * color + diffuse * color + specular * color;

// Good
float3 totalLight = ambient + diffuse + specular;
float3 lighting = totalLight * color;
```

## Platform-Specific Issues

### GLSL vs HLSL Differences

**Matrix Order**:
```cpp
// HLSL (row-major)
mul(matrix, vector);

// GLSL (column-major)
matrix * vector;
```

**Texture Coordinates**:
```hlsl
// DirectX - (0,0) is top-left
float2 uv = input.texcoord;

// OpenGL - (0,0) is bottom-left
float2 uv = float2(input.texcoord.x, 1.0 - input.texcoord.y);
```

## Debugging Techniques

### Visualize Intermediate Values

```hlsl
// Debug output - visualize normals
return float4(normal * 0.5 + 0.5, 1.0);

// Debug output - visualize UVs
return float4(uv, 0.0, 1.0);

// Debug output - check for NaN
if (any(isnan(value))) {
    return float4(1, 0, 0, 1);  // Red for NaN
}
if (any(isinf(value))) {
    return float4(0, 1, 0, 1);  // Green for Inf
}
```

### Add Bounds Checking

```hlsl
// Clamp all potentially problematic values
value = clamp(value, minValue, maxValue);

// Or use saturate for 0-1 range
value = saturate(value);
```

### Use Shader Validation

Enable shader validation in debug builds:
```cpp
// DirectX
#ifdef _DEBUG
    compileFlags |= D3DCOMPILE_DEBUG | D3DCOMPILE_SKIP_OPTIMIZATION;
#endif
```
