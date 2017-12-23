#version 300 es

precision mediump float;

in vec2 pass_texCoord;

uniform sampler2D textureSampler;
uniform int hasTexture;
uniform vec4 color;

out vec4 fragColor;

void main()
{
  if(hasTexture == 1) {
    fragColor = texture(textureSampler, pass_texCoord);
  } else {
    fragColor = color;
  }
}
