# frozen_string_literal: true
# Shared local/CI gate: build production output and check local links without curl.
require 'jekyll'
require 'nokogiri'
require 'uri'
require 'optparse'

root = File.expand_path('..', __dir__)
options = { destination: File.join(root, 'admin', 'publish-check') }
OptionParser.new { |parser| parser.on('--destination PATH') { |value| options[:destination] = File.expand_path(value, root) } }.parse!
ENV['JEKYLL_ENV'] = 'production'
errors = []
Dir.glob(File.join(root, '{_posts,_tabs}', '*.md')).each do |file|
  raw = File.read(file, encoding: 'UTF-8')
  next unless (match = raw.match(/\A---\r?\n(.*?)\r?\n---/m))
  data = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true, filename: file) || {}
  next unless data.key?('image')
  image = data['image']
  image = image['path'] if image.is_a?(Hash)
  errors << "#{file.delete_prefix(root + '/')}: image must be omitted or have a non-empty path" unless image.is_a?(String) && !image.strip.empty?
end
unless errors.empty?
  warn errors.join("\n")
  exit 1
end
Jekyll::Commands::Build.process({ 'source' => root, 'destination' => options[:destination], 'config' => File.join(root, '_config.yml') })
destination = options[:destination]
config = Jekyll.configuration({ 'source' => root, 'config' => File.join(root, '_config.yml') })
baseurl = config['baseurl'].to_s.sub(%r{/$}, '')
Dir.glob(File.join(destination, '**', '*.html')).each do |file|
  doc = Nokogiri::HTML(File.read(file, encoding: 'UTF-8'))
  doc.css('[href], img[src], script[src]').each do |element|
    attribute = element['href'] ? 'href' : 'src'
    value = element[attribute].to_s.strip
    next if value.empty? || value.start_with?('#', '//') || value.match?(/\A[a-z][a-z0-9+.-]*:/i)
    relative = URI::DEFAULT_PARSER.unescape(value.split(/[?#]/, 2).first.to_s)
    relative = relative.delete_prefix(baseurl) if !baseurl.empty? && (relative == baseurl || relative.start_with?(baseurl + '/'))
    target = if relative.start_with?('/')
               File.expand_path('.' + relative, destination)
             else
               File.expand_path(relative, File.dirname(file))
             end
    inside = target == destination || target.start_with?(destination + File::SEPARATOR)
    exists = inside && (File.file?(target) || File.file?(File.join(target, 'index.html')) || File.file?(target + '.html'))
    errors << "#{file.delete_prefix(destination + '/')}: #{attribute}=#{value} does not exist" unless exists
  end
end
unless errors.empty?
  warn errors.uniq.join("\n")
  exit 1
end
puts 'Production build and internal link/image checks passed.'
